// server/routes/consolidations.js
import { z } from "zod";
import { eq, and, inArray, desc } from "drizzle-orm";
import {
  consolidations,
  consolidationPl,
  consolidationStatusHistory,
  consolidationExpenses,
  pl,
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
    .enum(["to_load", "loaded", "to_customs", "released", "kg_customs", "collect_payment", "delivered", "closed"])
    .optional(),
  note: z.string().optional(),
  changedBy: z.string().optional(),
  capacityKg: z.coerce.number().optional(),
  capacityCbm: z.coerce.number().optional(),
  machineCost: z.coerce.number().optional(),
});

const SetPLsBody = z.object({
  plIds: z.array(z.number().int()).default([]),
  plLoadOrders: z.record(z.string(), z.coerce.number()).optional(), // { [plId: string]: loadOrder }
  plDetails: z.record(z.string(), z.object({
    clientPrice: z.coerce.number().optional(),
    allocatedLeg2Usd: z.coerce.number().optional(), // New field name for allocated KG
    allocationMode: z.enum(["auto", "manual"]).optional(),
  })).optional(), // { [plId: string]: details }
});

const ExpenseBody = z.object({
  type: z.enum(["customs", "other"]),
  comment: z.string().optional(),
  amount: z.number().min(0),
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
      
      // Get PL links with calculator fields
      const links = await db
        .select()
        .from(consolidationPl)
        .where(eq(consolidationPl.consolidationId, id))
        .orderBy(consolidationPl.loadOrder);
      
      const plIds = links.map((l) => l.plId);
      const plLoadOrders = links.reduce((acc, l) => {
        acc[l.plId] = l.loadOrder;
        return acc;
      }, {});
      
      // Get PL details for calculator
      const plDetails = links.reduce((acc, l) => {
        acc[l.plId] = {
          clientPrice: l.clientPrice,
          allocatedLeg2Usd: l.allocatedLeg2Usd ?? l.machineCostShare, // Support new and legacy fields
          allocationMode: l.allocationMode,
        };
        return acc;
      }, {});
      
      // Get expenses
      const expenses = await db
        .select()
        .from(consolidationExpenses)
        .where(eq(consolidationExpenses.consolidationId, id))
        .orderBy(desc(consolidationExpenses.createdAt));
      
      return { 
        ...cons, 
        plIds, 
        plLoadOrders,
        plDetails,
        expenses,
      };
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
          const isMovingBackward = toIdx < fromIdx;
          
          // Проверяем, что статусы валидны
          if (fromIdx === -1 || toIdx === -1) {
            return reply.badRequest(
              `Недопустимый статус: ${before.status} или ${body.status}`
            );
          }
          
          // При движении назад разрешаем, но проверяем PL
          if (isMovingBackward) {
            try {
              await assertPLsNotBehind(db, id, body.status, true);
            } catch (e) {
              return reply.badRequest(e.message);
            }
          } else {
            // При движении вперед стандартная проверка
            try {
              await assertPLsNotBehind(db, id, body.status, false);
            } catch (e) {
              return reply.badRequest(e.message);
            }
          }
        }

        const [after] = await db
          .update(consolidations)
          .set({
            ...(body.title ? { title: body.title } : {}),
            ...(body.status ? { status: body.status } : {}),
            ...(body.capacityKg !== undefined ? { capacityKg: String(body.capacityKg) } : {}),
            ...(body.capacityCbm !== undefined ? { capacityCbm: String(body.capacityCbm) } : {}),
            ...(body.machineCost !== undefined ? { machineCost: String(body.machineCost) } : {}),
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

          // Sync all PLs in this consolidation to the new status
          const plLinks = await db
            .select({ plId: consolidationPl.plId })
            .from(consolidationPl)
            .where(eq(consolidationPl.consolidationId, id));
          
          const plIds = plLinks.map((l) => l.plId);
          if (plIds.length > 0) {
            await db
              .update(pl)
              .set({ status: body.status, updatedAt: new Date() })
              .where(inArray(pl.id, plIds));
          }
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
            .values(toAdd.map((plId) => ({ 
              consolidationId: id, 
              plId,
              loadOrder: body.plLoadOrders?.[plId] ?? 0 
            })))
            .onConflictDoNothing();
        }

        // Обновляем load_order для существующих
        if (body.plLoadOrders && Object.keys(body.plLoadOrders).length > 0) {
          for (const [plIdStr, order] of Object.entries(body.plLoadOrders)) {
            const plId = Number(plIdStr);
            if (target.has(plId)) {
              await db
                .update(consolidationPl)
                .set({ loadOrder: order })
                .where(
                  and(
                    eq(consolidationPl.consolidationId, id),
                    eq(consolidationPl.plId, plId)
                  )
                );
            }
          }
        }

        // Обновляем calculator details для PL
        if (body.plDetails && Object.keys(body.plDetails).length > 0) {
          for (const [plIdStr, details] of Object.entries(body.plDetails)) {
            const plId = Number(plIdStr);
            if (target.has(plId)) {
              const updateData = {};
              if (details.clientPrice !== undefined) updateData.clientPrice = String(details.clientPrice);
              if (details.allocatedLeg2Usd !== undefined) {
                updateData.allocatedLeg2Usd = String(details.allocatedLeg2Usd);
                // Also update legacy field for backward compatibility
                updateData.machineCostShare = String(details.allocatedLeg2Usd);
              }
              if (details.allocationMode) updateData.allocationMode = details.allocationMode;
              
              if (Object.keys(updateData).length > 0) {
                await db
                  .update(consolidationPl)
                  .set(updateData)
                  .where(
                    and(
                      eq(consolidationPl.consolidationId, id),
                      eq(consolidationPl.plId, plId)
                    )
                  );
              }
              
              // Синхронизируем allocatedLeg2Usd в PL.leg2ManualAmountUsd (explicit manual field)
              // This allows PL card to show the allocated value when in consolidation
              if (details.allocatedLeg2Usd !== undefined) {
                await db
                  .update(pl)
                  .set({ 
                    leg2ManualAmountUsd: String(details.allocatedLeg2Usd),
                    leg2ManualAmount: String(details.allocatedLeg2Usd),
                    leg2ManualCurrency: "USD",
                    // Also sync to legacy fields for backward compatibility
                    leg2AmountUsd: String(details.allocatedLeg2Usd),
                    leg2Amount: String(details.allocatedLeg2Usd),
                    leg2Currency: "USD",
                  })
                  .where(eq(pl.id, plId));
              }
            }
          }
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
          .where(eq(consolidationPl.consolidationId, id))
          .orderBy(consolidationPl.loadOrder);
        const plIds = refreshed.map((r) => r.plId);
        const plLoadOrders = refreshed.reduce((acc, l) => {
          acc[l.plId] = l.loadOrder;
          return acc;
        }, {});
        const plDetails = refreshed.reduce((acc, l) => {
          acc[l.plId] = {
            clientPrice: l.clientPrice,
            allocatedLeg2Usd: l.allocatedLeg2Usd ?? l.machineCostShare,
            allocationMode: l.allocationMode,
          };
          return acc;
        }, {});
        const expenses = await db
          .select()
          .from(consolidationExpenses)
          .where(eq(consolidationExpenses.consolidationId, id))
          .orderBy(desc(consolidationExpenses.createdAt));
        return { consolidation: { ...cons, plIds, plLoadOrders, plDetails, expenses } };
      } catch (e) {
        console.error('[ERROR] CONS_SET_PL failed:', e);
        console.error('[ERROR] Stack:', e.stack);
        console.error('[ERROR] Request body:', JSON.stringify(req.body, null, 2));
        req.log.error({ e, id, body: req.body }, "CONS_SET_PL error");
        return reply.internalServerError(e.message || "Set PLs failed");
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

  // EXPENSES: LIST
  app.get("/:id/expenses", async (req, reply) => {
    const { id } = req.params;
    try {
      const rows = await db
        .select()
        .from(consolidationExpenses)
        .where(eq(consolidationExpenses.consolidationId, id))
        .orderBy(desc(consolidationExpenses.createdAt));
      return rows;
    } catch (e) {
      req.log.error({ e, id }, "CONS_EXPENSES_LIST error");
      return reply.internalServerError("List expenses failed");
    }
  });

  // EXPENSES: CREATE
  app.post(
    "/:id/expenses",
    { preHandler: app.authGuard },
    async (req, reply) => {
      const { id } = req.params;
      try {
        const body = ExpenseBody.parse(req.body ?? {});
        const [created] = await db
          .insert(consolidationExpenses)
          .values({
            consolidationId: id,
            type: body.type,
            comment: body.comment ?? null,
            amount: String(body.amount),
          })
          .returning();
        req.log.info({ id, expenseId: created.id }, "CONS_EXPENSE_CREATE ok");
        return reply.code(201).send(created);
      } catch (e) {
        req.log.error({ e, id, body: req.body }, "CONS_EXPENSE_CREATE error");
        return reply.internalServerError("Create expense failed");
      }
    }
  );

  // EXPENSES: UPDATE
  app.patch(
    "/:id/expenses/:expenseId",
    { preHandler: app.authGuard },
    async (req, reply) => {
      const { id, expenseId } = req.params;
      try {
        const body = ExpenseBody.partial().parse(req.body ?? {});
        const updateData = {};
        if (body.type !== undefined) updateData.type = body.type;
        if (body.comment !== undefined) updateData.comment = body.comment;
        if (body.amount !== undefined) updateData.amount = String(body.amount);
        updateData.updatedAt = new Date();

        const [updated] = await db
          .update(consolidationExpenses)
          .set(updateData)
          .where(
            and(
              eq(consolidationExpenses.id, expenseId),
              eq(consolidationExpenses.consolidationId, id)
            )
          )
          .returning();

        if (!updated) return reply.notFound("Expense not found");
        req.log.info({ id, expenseId }, "CONS_EXPENSE_UPDATE ok");
        return updated;
      } catch (e) {
        req.log.error({ e, id, expenseId, body: req.body }, "CONS_EXPENSE_UPDATE error");
        return reply.internalServerError("Update expense failed");
      }
    }
  );

  // EXPENSES: DELETE
  app.delete(
    "/:id/expenses/:expenseId",
    { preHandler: app.authGuard },
    async (req, reply) => {
      const { id, expenseId } = req.params;
      try {
        const res = await db
          .delete(consolidationExpenses)
          .where(
            and(
              eq(consolidationExpenses.id, expenseId),
              eq(consolidationExpenses.consolidationId, id)
            )
          )
          .returning();
        if (!res.length) return reply.notFound("Expense not found");
        req.log.info({ id, expenseId }, "CONS_EXPENSE_DELETE ok");
        return { ok: true };
      } catch (e) {
        req.log.error({ e, id, expenseId }, "CONS_EXPENSE_DELETE error");
        return reply.internalServerError("Delete expense failed");
      }
    }
  );
}