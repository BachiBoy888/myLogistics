// server/routes/pl.js
import fs from 'fs';
import path from 'path';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import {
  pl,
  clients,
  users,
  plDocuments,
  plDocStatusHistory,
  plComments,
  consolidations,
  consolidationPl,
  plEvents,
} from '../db/schema.js';
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

// обогащение PL именем ответственного (snake-case поля для фронта)
async function hydrateResponsible(db, row) {
  if (!row) return row;
  let responsibleName = null;
  if (row.responsibleUserId) {
    const [u] = await db.select().from(users).where(eq(users.id, row.responsibleUserId)).limit(1);
    responsibleName = u?.name ?? null;
  }
  return {
    ...row,
    clientPrice: row.clientPrice ?? row.client_price ?? null,
    responsible_user_id: row.responsibleUserId ?? null,
    responsible_name: responsibleName,
  };
}

export default async function plRoutes(fastify) {
  const db = fastify.drizzle;

  /* =========================
     PL: список / создание / обновление / удаление
     (префикс '/api/pl' навешан в server.js)
  ========================== */

  // ===== Список PL (с клиентами) =====
  fastify.get('/', async () => {
    const rows = await db
      .select({ p: pl, c: clients })
      .from(pl)
      .leftJoin(clients, eq(pl.clientId, clients.id))
      .orderBy(desc(pl.createdAt));
    return Promise.all(
      rows.map(async ({ p, c }) => ({
        ...(await hydrateResponsible(db, p)),
        client: toClientShape(c),
      }))
    );
  });

  // ===== Создать PL =====
  fastify.post(
    '/',
    {
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

        // системное событие «создан»
        await db.insert(plEvents).values({
          plId: saved.id,
          type: 'pl.created',
          message: 'PL создан',
          meta: { pl_number: plNumber },
          actorUserId: req.user?.id ?? null,
        });

        const [c] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
        return { ...(await hydrateResponsible(db, saved)), client: toClientShape(c) };
      } catch (err) {
        req.log.error({ tag: 'POST_PL_ERROR', err }, 'POST / (create PL) failed');
        return reply.code(500).send({ error: 'create_pl_failed', detail: err?.message || String(err), code: err?.code });
      }
    }
  );

  // ===== Обновить PL =====
  fastify.put(
    '/:id',
    {
      schema: {
        params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
        body: { type: 'object', additionalProperties: true },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const b = req.body || {};
      const toNumMaybe = (v) => (v === '' || v === null || v === undefined ? undefined : v);

      // прочитаем текущий для сравнения (события)
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
        // ответственный
        ...(b.responsible_user_id != null && { responsibleUserId: b.responsible_user_id || null }),
      };

      // если действительно нечего обновлять — вернуть текущий
      if (Object.keys(payload).length === 0) {
        const [c] = await db.select().from(clients).where(eq(clients.id, current.clientId)).limit(1);
        return { ...(await hydrateResponsible(db, current)), client: toClientShape(c) };
      }

      const [updated] = await db.update(pl).set(payload).where(eq(pl.id, Number(id))).returning();
      const [c] = await db.select().from(clients).where(eq(clients.id, updated.clientId)).limit(1);

      // события: статус изменился?
      if (b.status != null && b.status !== current.status) {
        await db.insert(plEvents).values({
          plId: updated.id,
          type: 'pl.status_changed',
          message: `Статус: ${current.status ?? '-'} → ${b.status}`,
          meta: { from: current.status ?? null, to: b.status },
          actorUserId: req.user?.id ?? null,
        });
      }

      // события: ответственный изменился?
      if (b.responsible_user_id !== undefined && b.responsible_user_id !== current.responsibleUserId) {
        // имена
        let fromName = null;
        let toName = null;
        if (current.responsibleUserId) {
          const [uFrom] = await db.select().from(users).where(eq(users.id, current.responsibleUserId)).limit(1);
          fromName = uFrom?.name ?? null;
        }
        if (updated.responsibleUserId) {
          const [uTo] = await db.select().from(users).where(eq(users.id, updated.responsibleUserId)).limit(1);
          toName = uTo?.name ?? null;
        }

        await db.insert(plEvents).values({
          plId: updated.id,
          type: 'pl.responsible_changed',
          message: `Ответственный: ${fromName ?? '—'} → ${toName ?? '—'}`,
          meta: {
            from_user_id: current.responsibleUserId ?? null,
            from_user_name: fromName,
            to_user_id: updated.responsibleUserId ?? null,
            to_user_name: toName,
          },
          actorUserId: req.user?.id ?? null,
        });
      }

      return { ...(await hydrateResponsible(db, updated)), client: toClientShape(c) };
    }
  );

  // ===== Удалить PL =====
  fastify.delete(
    '/:id',
    { schema: { params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] } } },
    async (req, reply) => {
      const { id } = req.params;
      const [deleted] = await db.delete(pl).where(eq(pl.id, Number(id))).returning();
      if (!deleted) return reply.notFound(`PL ${id} not found`);
      return { success: true };
    }
  );

  /* =========================
     ДОКУМЕНТЫ ПО PL
  ========================== */

  // Список документов
  fastify.get('/:plId/docs', async (req) => {
    const { plId } = req.params;
    const rows = await db
      .select()
      .from(plDocuments)
      .where(eq(plDocuments.plId, Number(plId)))
      .orderBy(desc(plDocuments.updatedAt));
    return rows;
  });

  // Загрузка/обновление документа (UPSERT по (plId, docType))
  fastify.post('/:plId/docs', async (req, reply) => {
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

    const { relative: storagePath } = await savePLFile(plIdNum, filename, fileBuf);
    req.log.info({ plId: plIdNum, docType, filename, size: fileBuf.length }, 'DOC_UPLOAD file received');

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
          status: 'pending',
          updatedAt: now,
        },
      })
      .returning();

    // событие «загружен документ»
    await db.insert(plEvents).values({
      plId: plIdNum,
      type: 'pl.doc_uploaded',
      message: `Загружен документ ${row.docType}`,
      meta: { doc_id: row.id, doc_type: row.docType, name: row.name || row.fileName },
      actorUserId: req.user?.id ?? null,
    });

    req.log.info({ docId: row.id }, 'DOC_UPLOAD ok');
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

      // событие «смена статуса документа»
      await db.insert(plEvents).values({
        plId: Number(plId),
        type: 'pl.doc_status_changed',
        message: `Статус документа ${updated.docType}: ${current.status} → ${status}`,
        meta: { doc_id: current.id, from: current.status, to: status, note: note ?? null },
        actorUserId: req.user?.id ?? null,
      });
    }
    return updated;
  });

  // История документа
  fastify.get('/:plId/docs/:docId/history', async (req) => {
    const { docId } = req.params;
    const rows = await db
      .select()
      .from(plDocStatusHistory)
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
  fastify.delete('/:plId/docs/:docId', async (req, reply) => {
    const { plId, docId } = req.params;
    const [deleted] = await db
      .delete(plDocuments)
      .where(and(eq(plDocuments.id, docId), eq(plDocuments.plId, Number(plId))))
      .returning();
    if (!deleted) return reply.notFound('Document not found');
    reply.code(204).send();
  });

  /* =========================
     PL: Комментарии
  ========================== */

  fastify.get('/:id/comments', { preHandler: fastify.authGuard }, async (req, reply) => {
    const { id } = req.params;
    const rows = await db
      .select()
      .from(plComments)
      .where(eq(plComments.plId, Number(id)))
      .orderBy(plComments.createdAt);
    return rows;
  });

  fastify.post(
    '/:id/comments',
    {
      preHandler: fastify.authGuard,
      schema: {
        params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
        body: {
          type: 'object',
          additionalProperties: true,
          properties: { text: { type: 'string' } },
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

      // событие «комментарий»
      await db.insert(plEvents).values({
        plId: Number(id),
        type: 'pl.comment',
        message: displayName + ': ' + trimmed,
        meta: { author: displayName, user_id: userId },
        actorUserId: userId,
      });

      reply.code(201);
      return row;
    }
  );

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

  /* =========================
     PL: События (таймлайн)
  ========================== */

  fastify.get('/:id/events', async (req, reply) => {
    const { id } = req.params;
    const plId = Number(id);
    if (!Number.isInteger(plId)) return reply.badRequest('Bad id');

    const [row] = await db.select().from(pl).where(eq(pl.id, plId)).limit(1);
    if (!row) return reply.notFound('PL not found');

    // 1) Системные события из pl_events (+ имя актёра)
    const rawEvents = await db
      .select({
        id: plEvents.id,
        type: plEvents.type,
        message: plEvents.message,
        meta: plEvents.meta,
        createdAt: plEvents.createdAt,
        actorUserId: plEvents.actorUserId,
        actorName: users.name,
      })
      .from(plEvents)
      .leftJoin(users, eq(plEvents.actorUserId, users.id))
      .where(eq(plEvents.plId, plId))
      .orderBy(plEvents.createdAt);

    const sysEvents = rawEvents.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.message || e.type,
      details: '',
      user: e.actorName ? { name: e.actorName } : null,
      createdAt: e.createdAt,
      meta: e.meta || {},
    }));

    // 2) Производные события из документов / истории / комментариев / консолидаций
    const [docs, comments, consLinks] = await Promise.all([
      db.select().from(plDocuments).where(eq(plDocuments.plId, plId)),
      db.select().from(plComments).where(eq(plComments.plId, plId)),
      db
        .select({ link: consolidationPl, cons: consolidations })
        .from(consolidationPl)
        .leftJoin(consolidations, eq(consolidationPl.consolidationId, consolidations.id))
        .where(eq(consolidationPl.plId, plId)),
    ]);

    // история статусов документов
    let docHistory = [];
    const docIds = docs.map((d) => d.id);
    if (docIds.length > 0) {
      docHistory = await db
        .select()
        .from(plDocStatusHistory)
        .where(inArray(plDocStatusHistory.docId, docIds));
    }

    let cnt = 0;
    const eid = (type) => `${type}-${plId}-${Date.now()}-${cnt++}`;

    const derived = [];

    // Создание PL (если нет в системных)
    if (row.createdAt) {
      const alreadyHasCreated = sysEvents.some((e) => e.type === 'pl.created');
      if (!alreadyHasCreated) {
        derived.push({
          id: eid('pl.created'),
          type: 'pl.created',
          title: 'PL создан',
          details: '',
          user: null,
          createdAt: row.createdAt,
          meta: { pl_number: row.plNumber ?? null },
        });
      }
    }

    for (const d of docs) {
      derived.push({
        id: eid('pl.doc_uploaded'),
        type: 'pl.doc_uploaded',
        title: 'Загружен документ',
        details: d.name || d.fileName || '',
        user: d.uploadedBy ? { name: d.uploadedBy } : null,
        createdAt: d.uploadedAt || d.updatedAt || d.createdAt || row.createdAt,
        meta: { doc_id: d.id, doc_type: d.docType },
      });
    }

    for (const h of docHistory) {
      derived.push({
        id: eid('pl.doc_status_changed'),
        type: 'pl.doc_status_changed',
        title: 'Статус документа',
        details: `${h.oldStatus ?? '—'} → ${h.newStatus}`,
        user: h.changedBy ? { name: h.changedBy } : null,
        createdAt: h.changedAt,
        meta: { doc_id: h.docId, from: h.oldStatus ?? null, to: h.newStatus },
      });
    }

    for (const c of comments) {
      derived.push({
        id: eid('pl.comment'),
        type: 'pl.comment',
        title: 'Комментарий',
        details: c.body,
        user: c.author ? { name: c.author } : null,
        createdAt: c.createdAt,
        meta: { user_id: c.userId ?? null },
      });
    }

    for (const { link, cons } of consLinks) {
      derived.push({
        id: eid('pl.added_to_consolidation'),
        type: 'pl.added_to_consolidation',
        title: 'Добавлен в консолидацию',
        details: cons?.consNumber || '',
        user: null,
        createdAt: link.addedAt,
        meta: {
          cons_id: link.consolidationId,
          cons_number: cons?.consNumber || null,
          cons_status: cons?.status || null,
        },
      });
    }

    const events = [...sysEvents, ...derived].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    req.log.info({ plId, events: events.length }, 'PL_EVENTS built');
    return { items: events };
  });
}