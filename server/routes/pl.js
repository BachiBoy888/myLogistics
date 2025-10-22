// server/routes/pl.js
import fs from 'fs';
import path from 'path';
import { eq, desc, and } from 'drizzle-orm';
import {
  pl,
  clients,
  users,
  plDocuments,
  plDocStatusHistory,
  plComments,
  plEvents,
} from '../db/schema.js';
import { savePLFile, getUploadsRootAbs } from '../services/storage.js';

// компактное представление клиента
function toClientShape(c) {
  return c ? { id: c.id, name: c.name, phone: c.phone, company: c.company } : null;
}

// компактное представление пользователя
function toUserShape(u) {
  return u ? { id: u.id, name: u.name, role: u.role, email: u.email, phone: u.phone } : null;
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

// удобный логгер событий
async function logPlEvent(db, { plId, type, message, meta = {}, actorUserId = null }) {
  try {
    await db.insert(plEvents).values({
      plId,
      type,
      message,
      meta,
      actorUserId,
    });
  } catch (e) {
    // не валим основной поток
  }
}

export default async function plRoutes(fastify) {
  const db = fastify.drizzle;

  /* =========================
     PL: список / создание / обновление / удаление
     (путь без /pl, т.к. в server.js префикс '/api/pl')
  ========================== */

  // ===== Список PL (с клиентом и ответственным) =====
  fastify.get('/', { preHandler: fastify.authGuard }, async () => {
    const rows = await db
      .select({ p: pl, c: clients, u: users })
      .from(pl)
      .leftJoin(clients, eq(pl.clientId, clients.id))
      .leftJoin(users, eq(pl.responsibleUserId, users.id))
      .orderBy(desc(pl.createdAt));
    return rows.map(({ p, c, u }) => ({
      ...p,
      client: toClientShape(c),
      responsible: toUserShape(u),
    }));
  });

  // ===== Создать PL =====
  fastify.post(
    '/',
    {
      preHandler: fastify.authGuard,
      schema: {
        body: {
          type: 'object',
          additionalProperties: true,
          properties: {
            title: { type: ['string', 'null'] },
            name: { type: ['string', 'null'] },
            client_id: { type: 'integer' },
            weight: { type: ['number', 'string', 'null'] },
            weight_kg: { type: ['number', 'string', 'null'] },
            volume: { type: ['number', 'string', 'null'] },
            volume_cbm: { type: ['number', 'string', 'null'] },
            incoterm: { type: ['string', 'null'] },
            pickup_address: { type: ['string', 'null'] },
            shipper_name: { type: ['string', 'null'] },
            shipper_contacts: { type: ['string', 'null'] },
            status: { type: ['string', 'null'] },
            responsible_user_id: { type: ['string', 'null'] }, // UUID ответственного
          },
          required: ['client_id'],
        },
      },
    },
    async (req, reply) => {
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

        const [inserted] = await db
          .insert(pl)
          .values({
            name,
            weight,
            volume,
            clientId,
            incoterm: b.incoterm ?? null,
            pickupAddress: b.pickup_address ?? null,
            shipperName: b.shipper_name ?? null,
            shipperContacts: b.shipper_contacts ?? null,
            status: b.status ?? 'draft',
            responsibleUserId: b.responsible_user_id ?? null,
          })
          .returning({ id: pl.id, createdAt: pl.createdAt });

        const year = inserted.createdAt
          ? new Date(inserted.createdAt).getFullYear()
          : new Date().getFullYear();
        const plNumber = `PL-${year}-${inserted.id}`;
        const [saved] = await db
          .update(pl)
          .set({ plNumber })
          .where(eq(pl.id, inserted.id))
          .returning();

        // лог события создания
        await logPlEvent(db, {
          plId: saved.id,
          type: 'pl.created',
          message: `Создан PL ${plNumber}`,
          meta: { plNumber },
          actorUserId: req.user?.id || null,
        });

        // если задан ответственный — залогируем
        if (b.responsible_user_id) {
          await logPlEvent(db, {
            plId: saved.id,
            type: 'pl.responsible_assigned',
            message: `Назначен ответственный`,
            meta: { toUserId: b.responsible_user_id },
            actorUserId: req.user?.id || null,
          });
        }

        const [c] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
        // доберём ответственного
        let responsible = null;
        if (saved.responsibleUserId) {
          const [u] = await db.select().from(users).where(eq(users.id, saved.responsibleUserId)).limit(1);
          responsible = toUserShape(u);
        }

        return { ...saved, client: toClientShape(c), responsible };
      } catch (err) {
        req.log.error({ tag: 'POST_PL_ERROR', err }, 'POST / (create PL) failed');
        return reply
          .code(500)
          .send({ error: 'create_pl_failed', detail: err?.message || String(err), code: err?.code });
      }
    }
  );

  // ===== Обновить PL =====
  fastify.put(
    '/:id',
    {
      preHandler: fastify.authGuard,
      schema: {
        params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
        body: { type: 'object', additionalProperties: true },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const b = req.body;
      const toNumMaybe = (v) => (v === '' || v === null || v === undefined ? undefined : v);

      // прочитаем текущий для сравнения
      const [current] = await db.select().from(pl).where(eq(pl.id, Number(id))).limit(1);
      if (!current) return reply.notFound(`PL ${id} not found`);

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
        ...(b.responsible_user_id !== undefined && { responsibleUserId: b.responsible_user_id || null }),
      };

      if (Object.keys(payload).length === 0) return reply.badRequest('No updatable fields in body');

      const [updated] = await db.update(pl).set(payload).where(eq(pl.id, Number(id))).returning();
      if (!updated) return reply.notFound(`PL ${id} not found`);

      // события
      const actorUserId = req.user?.id || null;

      if (b.status != null && b.status !== current.status) {
        await logPlEvent(db, {
          plId: updated.id,
          type: 'pl.status_changed',
          message: `Статус: ${current.status || '—'} → ${b.status}`,
          meta: { from: current.status || null, to: b.status },
          actorUserId,
        });
      }

      if (b.responsible_user_id !== undefined && b.responsible_user_id !== current.responsibleUserId) {
        await logPlEvent(db, {
          plId: updated.id,
          type: 'pl.responsible_changed',
          message: `Ответственный: ${current.responsibleUserId || '—'} → ${b.responsible_user_id || '—'}`,
          meta: { fromUserId: current.responsibleUserId || null, toUserId: b.responsible_user_id || null },
          actorUserId,
        });
      }

      const [c] = await db.select().from(clients).where(eq(clients.id, updated.clientId)).limit(1);

      // доберём ответственного
      let responsible = null;
      if (updated.responsibleUserId) {
        const [u] = await db.select().from(users).where(eq(users.id, updated.responsibleUserId)).limit(1);
        responsible = toUserShape(u);
      }

      return {
        ...updated,
        clientPrice: updated.clientPrice ?? updated.client_price ?? null,
        client: toClientShape(c),
        responsible,
      };
    }
  );

  // ===== Удалить PL =====
  fastify.delete(
    '/:id',
    {
      preHandler: fastify.authGuard,
      schema: { params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] } },
    },
    async (req, reply) => {
      const { id } = req.params;
      const [deleted] = await db.delete(pl).where(eq(pl.id, Number(id))).returning();
      if (!deleted) return reply.notFound(`PL ${id} not found`);

      await logPlEvent(db, {
        plId: Number(id),
        type: 'pl.deleted',
        message: `PL удалён`,
        meta: { plNumber: deleted.plNumber || null },
        actorUserId: req.user?.id || null,
      });

      return { success: true };
    }
  );

  /* =========================
     ДОКУМЕНТЫ ПО PL
  ========================== */

  // Список документов
  fastify.get('/:plId/docs', { preHandler: fastify.authGuard }, async (req) => {
    const { plId } = req.params;
    const rows = await db
      .select()
      .from(plDocuments)
      .where(eq(plDocuments.plId, Number(plId)))
      .orderBy(desc(plDocuments.updatedAt));
    return rows;
  });

  // Загрузка/обновление документа (UPSERT по (plId, docType))
  fastify.post('/:plId/docs', { preHandler: fastify.authGuard }, async (req, reply) => {
    const { plId } = req.params;
    const plIdNum = Number(plId);
    req.log.info({ plId: plIdNum }, 'DOC_UPLOAD start');

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
          if (part.fieldname === 'name') customName = String(part.value).replace(/^"|"$/g, '');
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
    req.log.info({ plId: plIdNum, docType, filename, size: fileBuf.length }, 'DOC_UPLOAD file received');

    // Безопасный UPSERT строго по (plId, docType)
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
        uploadedBy: req.user?.name || 'ui',
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
          status: 'pending', // новая версия → обратно на проверку
          updatedAt: now,
        },
      })
      .returning();

    // событие: документ загружен/обновлён
    await logPlEvent(db, {
      plId: plIdNum,
      type: 'doc.uploaded',
      message: `Загружен документ ${row.docType}`,
      meta: { docId: row.id, docType: row.docType, fileName: row.fileName },
      actorUserId: req.user?.id || null,
    });

    req.log.info({ docId: row.id }, 'DOC_UPLOAD ok');
    return reply.code(201).send(row);
  });

  // Обновить статус/имя/заметку документа
  fastify.patch('/:plId/docs/:docId', { preHandler: fastify.authGuard }, async (req, reply) => {
    const { plId, docId } = req.params;
    const { status, note, name } = req.body ?? {};

    const [current] = await db
      .select()
      .from(plDocuments)
      .where(and(eq(plDocuments.id, docId), eq(plDocuments.plId, Number(plId))))
      .limit(1);
    if (!current) return reply.notFound('Document not found');

    const [updated] = await db
      .update(plDocuments)
      .set({
        ...(status != null && { status }),
        ...(note != null && { note }),
        ...(name != null && { name }),
        updatedAt: new Date(),
      })
      .where(eq(plDocuments.id, docId))
      .returning();

    if (status && status !== current.status) {
      await db.insert(plDocStatusHistory).values({
        docId: current.id,
        oldStatus: current.status,
        newStatus: status,
        note: note ?? null,
        changedBy: req.user?.name || 'system',
      });

      // событие: смена статуса документа
      await logPlEvent(db, {
        plId: Number(plId),
        type: 'doc.status_changed',
        message: `Статус документа ${current.docType}: ${current.status} → ${status}`,
        meta: { docId: current.id, docType: current.docType, from: current.status, to: status },
        actorUserId: req.user?.id || null,
      });
    }
    return updated;
  });

  // История
  fastify.get('/:plId/docs/:docId/history', { preHandler: fastify.authGuard }, async (req) => {
    const { docId } = req.params;
    const rows = await db
      .select()
      .from(plDocStatusHistory)
      .where(eq(plDocStatusHistory.docId, docId))
      .orderBy(desc(plDocStatusHistory.changedAt));
    return rows;
  });

  // Preview (inline)
  fastify.get('/:plId/docs/:docId/preview', { preHandler: fastify.authGuard }, async (req, reply) => {
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
    try {
      await fs.promises.access(abs, fs.constants.R_OK);
    } catch {
      return reply.notFound('File not found');
    }

    const stream = fs.createReadStream(abs);
    reply.header('Content-Type', doc.mimeType || 'application/octet-stream');
    reply.header('Content-Length', doc.sizeBytes || undefined);
    reply.header('Content-Disposition', contentDispositionInline(doc.fileName || storedName));
    return reply.send(stream);
  });

  // Download (attachment)
  fastify.get('/:plId/docs/:docId/download', { preHandler: fastify.authGuard }, async (req, reply) => {
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
    try {
      await fs.promises.access(abs, fs.constants.R_OK);
    } catch {
      return reply.notFound('File not found');
    }

    const stream = fs.createReadStream(abs);
    reply.header('Content-Type', doc.mimeType || 'application/octet-stream');
    reply.header('Content-Length', doc.sizeBytes || undefined);
    reply.header('Content-Disposition', contentDispositionAttachment(doc.fileName || storedName));
    return reply.send(stream);
  });

  // Удалить документ
  fastify.delete('/:plId/docs/:docId', { preHandler: fastify.authGuard }, async (req, reply) => {
    const { plId, docId } = req.params;
    const [deleted] = await db
      .delete(plDocuments)
      .where(and(eq(plDocuments.id, docId), eq(plDocuments.plId, Number(plId))))
      .returning();
    if (!deleted) return reply.notFound('Document not found');

    // событие: удаление документа
    await logPlEvent(db, {
      plId: Number(plId),
      type: 'doc.deleted',
      message: `Удалён документ ${deleted.docType}`,
      meta: { docId: deleted.id, docType: deleted.docType, fileName: deleted.fileName },
      actorUserId: req.user?.id || null,
    });

    reply.code(204).send();
  });

  /* =========================
     PL: Комментарии
  ========================== */

  // Список комментариев по PL (закрыт под авторизацию)
  fastify.get('/:id/comments', { preHandler: fastify.authGuard }, async (req, reply) => {
    const { id } = req.params;
    const rows = await db
      .select()
      .from(plComments)
      .where(eq(plComments.plId, Number(id)))
      .orderBy(plComments.createdAt);
    return rows;
  });

  // Добавить комментарий
  // body: { text: string }  (author игнорируется, берём из учётки)
  fastify.post(
    '/:id/comments',
    {
      preHandler: fastify.authGuard,
      schema: {
        params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
        body: {
          type: 'object',
          additionalProperties: true, // разрешаем прислать author, но игнорируем
          properties: {
            text: { type: 'string' },
          },
          required: ['text'],
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const { text } = req.body || {};
      const trimmed = String(text || '').trim();
      if (!trimmed) return reply.badRequest('text is required');

      const displayName = req.user?.name || 'Логист';
      const userId = req.user?.id || null;

      const [row] = await db
        .insert(plComments)
        .values({
          plId: Number(id),
          userId,
          author: displayName,
          body: trimmed,
        })
        .returning();

      reply.code(201);
      return row;
    }
  );

  // Удалить комментарий
  fastify.delete(
    '/:id/comments/:cid',
    {
      preHandler: fastify.authGuard,
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'integer' }, cid: { type: 'string' } },
          required: ['id', 'cid'],
        },
      },
    },
    async (req, reply) => {
      const { id, cid } = req.params;
      const { rowCount } = await db
        .delete(plComments)
        .where(and(eq(plComments.id, cid), eq(plComments.plId, Number(id))));
      if (rowCount === 0) return reply.notFound('Comment not found');
      reply.code(204).send();
    }
  );
}