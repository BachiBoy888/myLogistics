// server/routes/consolidations.js
import { z } from "zod";
import { eq, and, inArray, desc } from "drizzle-orm";
import {
  consolidations,
  consolidationPl,
  consolidationStatusHistory,
} from "../db/schema.js";
import { nextConsNumber } from "../services/consolidations.js";
import {
  ensureAllPLsAreToLoad,
  assertPLsNotBehind,
  CONS_PIPELINE,
} from "../services/cons-validators.js";

const CreateBody = z.object({
  title: z.string().optional(),
  plIds: z.array(z.number().int()).optional(), // у нас pl.id = INTEGER
});

const UpdateBody = z.object({
  title: z.string().optional(),
  status: z
    .enum(["loaded", "to_customs", "released", "kg_customs", "delivered", "closed"])
    .optional(),
  note: z.string().optional(),
  changedBy: z.string().optional(),
});

const SetPLsBody = z.object({
  plIds: z.array(z.number().int()).default([]),
});

export default async function consolidationsRoutes(app) {
  const db = app.drizzle;

  // LIST
  app.get("/", async (req, reply) => {
    try {
      const { status } = req.query ?? {};
      if (status && !CONS_PIPELINE.includes(status)) {
        return reply.badRequest("Unknown status");
      }
      const rows = status
        ? await db
            .select()
            .from(consolidations)
            .where(eq(consolidations.status, status))
            .orderBy(desc(consolidations.createdAt))
        : await db
            .select()
            .from(consolidations)
            .orderBy(desc(consolidations.createdAt));
      return rows;
    } catch (e) {
      req.log.error({ e }, "CONS_LIST error");
      return reply.internalServerError("List failed");
    }
  });

  // GET by id
  app.get("/:id", async (req, reply) => {
    const { id } = req.params;
    try {
      const [cons] = await db
        .select()
        .from(consolidations)
        .where(eq(consolidations.id, id));
      if (!cons) return reply.notFound("Consolidation not found");
      const links = await db
        .select()
        .from(consolidationPl)
        .where(eq(consolidationPl.consolidationId, id));
      const plIds = links.map((l) => l.plId);
      return { ...cons, plIds };
    } catch (e) {
      req.log.error({ e, id }, "CONS_GET error");
      return reply.internalServerError("Get failed");
    }
  });

  // CREATE
  app.post(
    "/",
    { preHandler: app.authGuard },
    async (req, reply) => {
      try {
        // аккуратно приводим к числам ДО zod
        const raw = { ...(req.body ?? {}) };
        if (Array.isArray(raw.plIds)) raw.plIds = raw.plIds.map((v) => Number(v));
        const body = CreateBody.parse(raw);

        if (body.plIds?.length) {
          try {
            await ensureAllPLsAreToLoad(db, body.plIds);
          } catch (e) {
            return reply.badRequest(e.message);
          }
        }

        const consNumber = await nextConsNumber(db);

        const [created] = await db
          .insert(consolidations)
          .values({
            consNumber,
            title: body.title ?? consNumber,
            status: "loaded",
          })
          .returning();

        if (body.plIds?.length) {
          const rows = body.plIds.map((plId) => ({ consolidationId: created.id, plId }));
          await db.insert(consolidationPl).values(rows).onConflictDoNothing();
        }

        req.log.info({ id: created.id, consNumber }, "CONS_CREATE ok");
        return reply.code(201).send(created);
      } catch (e) {
        req.log.error({ e, body: req.body }, "CONS_CREATE error");
        return reply.internalServerError(e?.message || "Create failed");
      }
    }
  );

  // UPDATE (title/status)
  app.patch(
    "/:id",
    { preHandler: app.authGuard },
    async (req, reply) => {
      const { id } = req.params;
      try {
        const body = UpdateBody.parse(req.body ?? {});
        const [before] = await db
          .select()
          .from(consolidations)
          .where(eq(consolidations.id, id));
        if (!before) return reply.notFound("Consolidation not found");

        if (body.status) {
          const fromIdx = CONS_PIPELINE.indexOf(before.status);
          const toIdx = CONS_PIPELINE.indexOf(body.status);
          if (fromIdx === -1 || toIdx === -1 || toIdx < fromIdx) {
            return reply.badRequest(
              `Недопустимый переход статуса: ${before.status} → ${body.status}`
            );
          }
          try {
            await assertPLsNotBehind(db, id, body.status);
          } catch (e) {
            return reply.badRequest(e.message);
          }
        }

        const [after] = await db
          .update(consolidations)
          .set({
            ...(body.title ? { title: body.title } : {}),
            ...(body.status ? { status: body.status } : {}),
            updatedAt: new Date(),
          })
          .where(eq(consolidations.id, id))
          .returning();

        if (body.status && before.status !== body.status) {
          await db.insert(consolidationStatusHistory).values({
            consolidationId: id,
            fromStatus: before.status,
            toStatus: body.status,
            note: body.note ?? null,
            changedBy: body.changedBy ?? req.user?.name ?? null,
          });
        }

        req.log.info({ id, status: body.status }, "CONS_UPDATE ok");
        return after;
      } catch (e) {
        req.log.error({ e, id, body: req.body }, "CONS_UPDATE error");
        return reply.internalServerError(e?.message || "Update failed");
      }
    }
  );

  // DELETE
  app.delete(
    "/:id",
    { preHandler: app.authGuard },
    async (req, reply) => {
      const { id } = req.params;
      try {
        const res = await db
          .delete(consolidations)
          .where(eq(consolidations.id, id))
          .returning();
        if (!res.length) return reply.notFound("Consolidation not found");
        req.log.info({ id }, "CONS_DELETE ok");
        return { ok: true };
      } catch (e) {
        req.log.error({ e, id }, "CONS_DELETE error");
        return reply.internalServerError("Delete failed");
      }
    }
  );

  // ADD PL
  app.post(
    "/:id/pl",
    { preHandler: app.authGuard },
    async (req, reply) => {
      const { id } = req.params;
      try {
        const plId = Number(req.body?.plId);
        if (!Number.isInteger(plId)) return reply.badRequest("plId (number) required");
        try {
          await ensureAllPLsAreToLoad(db, [plId]);
        } catch (e) {
          return reply.badRequest(e.message);
        }
        await db
          .insert(consolidationPl)
          .values({ consolidationId: id, plId })
          .onConflictDoNothing();
        req.log.info({ id, plId }, "CONS_ADD_PL ok");
        return { ok: true };
      } catch (e) {
        req.log.error({ e, id, body: req.body }, "CONS_ADD_PL error");
        return reply.internalServerError("Add PL failed");
      }
    }
  );

  // SET exact PLs (bulk replace)
  app.put(
    "/:id/pl",
    { preHandler: app.authGuard },
    async (req, reply) => {
      const { id } = req.params;
      try {
        const raw = { ...(req.body ?? {}) };
        if (Array.isArray(raw.plIds)) raw.plIds = raw.plIds.map((v) => Number(v));
        const body = SetPLsBody.parse(raw);

        // Валидация статусов PL
        if (body.plIds.length) {
          try {
            await ensureAllPLsAreToLoad(db, body.plIds);
          } catch (e) {
            return reply.badRequest(e.message);
          }
        }

        // Текущие связи
        const links = await db
          .select()
          .from(consolidationPl)
          .where(eq(consolidationPl.consolidationId, id));
        const current = new Set(links.map((l) => l.plId));
        const target = new Set(body.plIds);

        const toAdd = body.plIds.filter((x) => !current.has(x));
        const toRemove = [...current].filter((x) => !target.has(x));

        if (toRemove.length) {
          await db
            .delete(consolidationPl)
            .where(
              and(
                eq(consolidationPl.consolidationId, id),
                inArray(consolidationPl.plId, toRemove)
              )
            );
        }

        if (toAdd.length) {
          await db
            .insert(consolidationPl)
            .values(toAdd.map((plId) => ({ consolidationId: id, plId })))
            .onConflictDoNothing();
        }

        req.log.info({ id, add: toAdd.length, remove: toRemove.length }, "CONS_SET_PL ok");

        // Вернём актуальный объект
        const [cons] = await db
          .select()
          .from(consolidations)
          .where(eq(consolidations.id, id));
        const refreshed = await db
          .select()
          .from(consolidationPl)
          .where(eq(consolidationPl.consolidationId, id));
        const plIds = refreshed.map((r) => r.plId);
        return { consolidation: { ...cons, plIds } };
      } catch (e) {
        req.log.error({ e, id, body: req.body }, "CONS_SET_PL error");
        return reply.internalServerError("Set PLs failed");
      }
    }
  );

  // REMOVE PL
  app.delete(
    "/:id/pl/:plId",
    { preHandler: app.authGuard },
    async (req, reply) => {
      const { id, plId } = req.params;
      try {
        const res = await db
          .delete(consolidationPl)
          .where(and(eq(consolidationPl.consolidationId, id), eq(consolidationPl.plId, Number(plId))))
          .returning();
        if (res.length === 0) return reply.notFound("Link not found");
        req.log.info({ id, plId }, "CONS_REMOVE_PL ok");
        return { ok: true };
      } catch (e) {
        req.log.error({ e, id, plId }, "CONS_REMOVE_PL error");
        return reply.internalServerError("Remove PL failed");
      }
    }
  );

  // STATUS HISTORY
  app.get("/:id/status-history", async (req, reply) => {
    const { id } = req.params;
    try {
      const rows = await db
        .select()
        .from(consolidationStatusHistory)
        .where(eq(consolidationStatusHistory.consolidationId, id))
        .orderBy(consolidationStatusHistory.createdAt);
      return rows;
    } catch (e) {
      req.log.error({ e, id }, "CONS_HISTORY error");
      return reply.internalServerError("History failed");
    }
  });
}