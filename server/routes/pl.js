// server/routes/pl.js
import fs from 'fs';
import path from 'path';
import { eq, desc, and } from 'drizzle-orm';
import { pl, clients, plDocuments, plDocStatusHistory } from '../db/schema.js';
import { savePLFile, getUploadsRootAbs } from '../services/storage.js';

// компактное представление клиента
function toClientShape(c) {
  return c ? { id: c.id, name: c.name, phone: c.phone, company: c.company } : null;
}

// безопасные заголовки Content-Disposition
function contentDispositionAttachment(filename) {
  const fallback = (filename || 'file').replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(filename || 'file');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
function contentDispositionInline(filename) {
  const fallback = (filename || 'file').replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(filename || 'file');
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export default async function plRoutes(fastify) {
  const db = fastify.drizzle;

  /* =========================
     PL: список / создание / обновление / удаление
     (путь без /pl, т.к. в server.js префикс '/api/pl')
  ========================== */

  // ===== Список PL (с клиентами) =====
  fastify.get('/', async () => {
    const rows = await db
      .select({ p: pl, c: clients })
      .from(pl)
      .leftJoin(clients, eq(pl.clientId, clients.id))
      .orderBy(desc(pl.createdAt));
    return rows.map(({ p, c }) => ({ ...p, client: toClientShape(c) }));
  });

  // ===== Создать PL =====
  fastify.post('/', {
    schema: {
      body: {
        type: 'object', additionalProperties: true,
        properties: {
          title: { type: ['string','null'] }, name: { type: ['string','null'] },
          client_id: { type: 'integer' },
          weight: { type: ['number','string','null'] }, weight_kg: { type: ['number','string','null'] },
          volume: { type: ['number','string','null'] }, volume_cbm: { type: ['number','string','null'] },
          incoterm: { type: ['string','null'] },
          pickup_address: { type: ['string','null'] },
          shipper_name: { type: ['string','null'] },
          shipper_contacts: { type: ['string','null'] },
          status: { type: ['string','null'] },
        },
        required: ['client_id'],
      }
    }
  }, async (req, reply) => {
    try {
      const b = req.body;
      const toNumStr = (v) => {
        if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return null;
        return Number(v).toFixed(3);
      };
      const name = b.name ?? b.title ?? 'Без названия';
      const weight = toNumStr(b.weight ?? b.weight_kg);
      const volume = toNumStr(b.volume ?? b.volume_cbm);
      const clientId = b.client_id;

      const [inserted] = await db.insert(pl).values({
        name, weight, volume, clientId,
        incoterm: b.incoterm ?? null,
        pickupAddress: b.pickup_address ?? null,
        shipperName: b.shipper_name ?? null,
        shipperContacts: b.shipper_contacts ?? null,
        status: b.status ?? 'draft',
      }).returning({ id: pl.id, createdAt: pl.createdAt });

      const year = inserted.createdAt ? new Date(inserted.createdAt).getFullYear() : new Date().getFullYear();
      const plNumber = `PL-${year}-${inserted.id}`;
      const [saved] = await db.update(pl).set({ plNumber }).where(eq(pl.id, inserted.id)).returning();

      const [c] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
      return { ...saved, client: toClientShape(c) };
    } catch (err) {
      req.log.error({ tag: 'POST_PL_ERROR', err }, 'POST / (create PL) failed');
      return reply.code(500).send({ error: 'create_pl_failed', detail: err?.message || String(err), code: err?.code });
    }
  });

  // ===== Обновить PL =====
  fastify.put('/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      body: { type: 'object', additionalProperties: true },
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const b = req.body;
    const toNumMaybe = (v) => (v === '' || v === null || v === undefined ? undefined : v);

    const payload = {
      ...(b.name != null && { name: b.name ?? b.title }),
      ...(b.title != null && b.name == null && { name: b.title }),
      ...(b.weight != null && { weight: toNumMaybe(b.weight) }),
      ...(b.weight_kg != null && b.weight == null && { weight: toNumMaybe(b.weight_kg) }),
      ...(b.volume != null && { volume: toNumMaybe(b.volume) }),
      ...(b.volume_cbm != null && b.volume == null && { volume: toNumMaybe(b.volume_cbm) }),
      ...(b.client_id != null && { clientId: b.client_id }),
      ...(b.incoterm != null && { incoterm: b.incoterm }),
      ...(b.pickup_address != null && { pickupAddress: b.pickup_address }),
      ...(b.shipper_name != null && { shipperName: b.shipper_name }),
      ...(b.shipper_contacts != null && { shipperContacts: b.shipper_contacts }),
      ...(b.status != null && { status: b.status }),
      ...(b.clientPrice != null && { clientPrice: toNumMaybe(b.clientPrice) }),
      ...(b.client_price != null && b.clientPrice == null && { clientPrice: toNumMaybe(b.client_price) }),
    };

    if (Object.keys(payload).length === 0) return reply.badRequest('No updatable fields in body');

    const [updated] = await db.update(pl).set(payload).where(eq(pl.id, Number(id))).returning();
    if (!updated) return reply.notFound(`PL ${id} not found`);

    const [c] = await db.select().from(clients).where(eq(clients.id, updated.clientId)).limit(1);
    return { ...updated, clientPrice: updated.clientPrice ?? updated.client_price ?? null, client: toClientShape(c) };
  });

  // ===== Удалить PL =====
  fastify.delete('/:id', {
    schema: { params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] } }
  }, async (req, reply) => {
    const { id } = req.params;
    const [deleted] = await db.delete(pl).where(eq(pl.id, Number(id))).returning();
    if (!deleted) return reply.notFound(`PL ${id} not found`);
    return { success: true };
  });

  /* =========================
     ДОКУМЕНТЫ ПО PL
  ========================== */

  // Список документов
  fastify.get('/:plId/docs', async (req) => {
    const { plId } = req.params;
    const rows = await db.select().from(plDocuments)
      .where(eq(plDocuments.plId, Number(plId)))
      .orderBy(desc(plDocuments.updatedAt));
    return rows;
  });

  // Загрузка/обновление документа (UPSERT по (plId, docType))
  fastify.post('/:plId/docs', async (req, reply) => {
    const { plId } = req.params;
    const plIdNum = Number(plId);
    req.log.info({ plId: plIdNum }, "DOC_UPLOAD start");

    if (!Number.isInteger(plIdNum)) return reply.badRequest('Bad plId');

    let docType = null;
    let customName = null;

    let fileBuf = null;
    let filename = null;
    let mimetype = 'application/octet-stream';

    try {
      const parts = req.parts();
      for await (const part of parts) {
        if (part.type === 'file' && !fileBuf) {
          const chunks = [];
          for await (const ch of part.file) chunks.push(ch);
          fileBuf = Buffer.concat(chunks);
          filename = part.filename || 'upload.bin';
          mimetype = part.mimetype || mimetype;
        } else if (part.type === 'field') {
          if (part.fieldname === 'doc_type') docType = String(part.value).replace(/^"|"$/g, '');
          if (part.fieldname === 'name')     customName = String(part.value).replace(/^"|"$/g, '');
        }
      }
    } catch (e) {
      req.log.error({ tag: 'UPLOAD_PARSE_ERROR', e });
      return reply.badRequest('Malformed multipart/form-data');
    }

    if (!fileBuf) return reply.badRequest('No file uploaded');
    if (!docType) return reply.badRequest('doc_type is required');

    // Сохраняем физически (имя — исходное)
    const { relative: storagePath } = await savePLFile(plIdNum, filename, fileBuf);
    req.log.info({ plId: plIdNum, docType, filename, size: fileBuf.length }, "DOC_UPLOAD file received");

    // Безопасный UPSERT строго по (plId, docType)
    // Требует уникального индекса uq_pl_doc_type (pl_id, doc_type) — он добавлен в schema.js
    const now = new Date();
    const [row] = await db
      .insert(plDocuments)
      .values({
        plId: plIdNum,
        docType: String(docType),
        name: customName ?? null,
        fileName: filename,
        mimeType: mimetype,
        sizeBytes: fileBuf.length,
        storagePath,
        status: 'pending',
        uploadedBy: 'ui',
        uploadedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [plDocuments.plId, plDocuments.docType],
        set: {
          name: customName ?? plDocuments.name,
          fileName: filename,
          mimeType: mimetype,
          sizeBytes: fileBuf.length,
          storagePath,
          status: 'pending',      // новая версия → обратно на проверку
          updatedAt: now,
        },
      })
      .returning();

    req.log.info({ docId: row.id }, "DOC_UPLOAD ok");
    return reply.code(201).send(row);
  });

  // Обновить статус/имя/заметку документа
  fastify.patch('/:plId/docs/:docId', async (req, reply) => {
    const { plId, docId } = req.params;
    const { status, note, name } = req.body ?? {};

    const [current] = await db
      .select()
      .from(plDocuments)
      .where(and(eq(plDocuments.id, docId), eq(plDocuments.plId, Number(plId))))
      .limit(1);
    if (!current) return reply.notFound('Document not found');

    const [updated] = await db.update(plDocuments).set({
      ...(status != null && { status }),
      ...(note != null && { note }),
      ...(name != null && { name }),
      updatedAt: new Date(),
    }).where(eq(plDocuments.id, docId)).returning();

    if (status && status !== current.status) {
      await db.insert(plDocStatusHistory).values({
        docId: current.id,
        oldStatus: current.status,
        newStatus: status,
        note: note ?? null,
        changedBy: (req.headers['x-user'] && String(req.headers['x-user'])) || 'system',
      });
    }
    return updated;
  });

  // История
  fastify.get('/:plId/docs/:docId/history', async (req) => {
    const { plId, docId } = req.params;
    const rows = await db.select().from(plDocStatusHistory)
      .where(eq(plDocStatusHistory.docId, docId))
      .orderBy(desc(plDocStatusHistory.changedAt));
    return rows;
  });

  // Preview (inline)
  fastify.get('/:plId/docs/:docId/preview', async (req, reply) => {
    const { plId, docId } = req.params;
    const [doc] = await db
      .select()
      .from(plDocuments)
      .where(and(eq(plDocuments.id, docId), eq(plDocuments.plId, Number(plId))))
      .limit(1);
    if (!doc) return reply.notFound('Document not found');

    const storedName = String(doc.storagePath || '').split('/').pop();
    if (!storedName) return reply.notFound('File not found');

    const abs = path.join(getUploadsRootAbs(), 'pl', String(plId), storedName);
    try { await fs.promises.access(abs, fs.constants.R_OK); } catch { return reply.notFound('File not found'); }

    const stream = fs.createReadStream(abs);
    reply.header('Content-Type', doc.mimeType || 'application/octet-stream');
    reply.header('Content-Length', doc.sizeBytes || undefined);
    reply.header('Content-Disposition', contentDispositionInline(doc.fileName || storedName));
    return reply.send(stream);
  });

  // Download (attachment)
  fastify.get('/:plId/docs/:docId/download', async (req, reply) => {
    const { plId, docId } = req.params;
    const [doc] = await db
      .select()
      .from(plDocuments)
      .where(and(eq(plDocuments.id, docId), eq(plDocuments.plId, Number(plId))))
      .limit(1);
    if (!doc) return reply.notFound('Document not found');

    const storedName = String(doc.storagePath || '').split('/').pop();
    if (!storedName) return reply.notFound('File not found');

    const abs = path.join(getUploadsRootAbs(), 'pl', String(plId), storedName);
    try { await fs.promises.access(abs, fs.constants.R_OK); } catch { return reply.notFound('File not found'); }

    const stream = fs.createReadStream(abs);
    reply.header('Content-Type', doc.mimeType || 'application/octet-stream');
    reply.header('Content-Length', doc.sizeBytes || undefined);
    reply.header('Content-Disposition', contentDispositionAttachment(doc.fileName || storedName));
    return reply.send(stream);
  });

  // Удалить документ
  fastify.delete('/:plId/docs/:docId', async (req, reply) => {
    const { plId, docId } = req.params;
    const [deleted] = await db
      .delete(plDocuments)
      .where(and(eq(plDocuments.id, docId), eq(plDocuments.plId, Number(plId))))
      .returning();
    if (!deleted) return reply.notFound('Document not found');
    reply.code(204).send();
  });
}