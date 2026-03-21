import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { leads, clients, pl, users } from "../db/schema.js";
import { normalizePhone, generatePhoneVariants } from "../lib/phone.js";

/**
 * Fastify-плагин с роутами для лидов.
 * Регистрируется в server.js: app.register(leadsRoutes, { prefix: "/api" })
 */

// Разрешённые источники лидов
const ALLOWED_SOURCES = ["website_calculator", "prolife_site", "external_site"];

// Разрешённые точки входа
const ALLOWED_ENTRY_POINTS = ["calculator", "contact_form", "lab_calculator"];

// Получить источник лида из заголовка, query параметра или тела запроса
function getLeadSource(req, bodySource) {
  // Приоритет 1: явно переданный source в body (с валидацией)
  if (bodySource && ALLOWED_SOURCES.includes(bodySource)) {
    return bodySource;
  }

  // Приоритет 2: X-Source заголовок
  const headerSource = req.headers["x-source"];
  if (headerSource && ALLOWED_SOURCES.includes(headerSource)) {
    return headerSource;
  }

  // Приоритет 3: query параметр
  const querySource = req.query?.source;
  if (querySource && ALLOWED_SOURCES.includes(querySource)) {
    return querySource;
  }

  // Fallback для обратной совместимости
  return "website_calculator";
}

// Простая формула расчёта стоимости доставки (MVP)
function calculateEstimate({ weight, volume, deliveryType, originCity, destinationCity }) {
  const w = Number(weight) || 0;
  const v = Number(volume) || 0;

  // Базовые ставки (USD)
  const baseRates = {
    air: { perKg: 8.5, perCbm: 1200, baseDays: 5, varianceDays: 3 },
    road: { perKg: 2.5, perCbm: 350, baseDays: 12, varianceDays: 5 },
    express: { perKg: 12.0, perCbm: 1800, baseDays: 3, varianceDays: 2 },
  };

  const rate = baseRates[deliveryType] || baseRates.road;

  // Расчёт по весу или объёму (что больше)
  const weightCost = w * rate.perKg;
  const volumeCost = v * rate.perCbm;
  const estimatedPrice = Math.max(weightCost, volumeCost, 50); // Минимум $50

  // Дни доставки
  const estimatedDaysMin = rate.baseDays - Math.floor(rate.varianceDays / 2);
  const estimatedDaysMax = rate.baseDays + Math.floor(rate.varianceDays / 2);

  return {
    estimatedPrice: Math.round(estimatedPrice * 100) / 100,
    estimatedCurrency: "USD",
    estimatedDaysMin,
    estimatedDaysMax,
  };
}

/**
 * Find existing clients by normalized phone using variant matching
 * Avoids full table scan by querying with IN clause
 * @param {Object} db - Drizzle DB instance
 * @param {string|null} normalizedPhone - Canonical phone format
 * @returns {Promise<Array>} - Matching clients
 */
async function findClientsByNormalizedPhone(db, normalizedPhone) {
  if (!normalizedPhone) {
    return [];
  }

  const variants = generatePhoneVariants(normalizedPhone);
  if (variants.length === 0) {
    return [];
  }

  // Query using IN clause - efficient index lookup
  const results = await db
    .select()
    .from(clients)
    .where(inArray(clients.phone, variants));

  return results;
}

/**
 * Build proposed new client data from lead
 * @param {Object} lead - Lead object
 * @returns {Object} - Client creation payload
 */
function buildProposedClientFromLead(lead) {
  return {
    name: lead.name,
    phone: lead.phone,
    company: lead.company || null,
    email: lead.email || null,
    normalizedName: lead.name.toLowerCase().trim(),
  };
}

export default async function leadsRoutes(app) {
  const db = app.drizzle;

  // =========================
  // Публичные эндпоинты (без авторизации)
  // =========================

  // === Расчёт стоимости (публичный) ===
  app.post(
    "/public/calculate",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
      schema: {
        body: {
          type: "object",
          properties: {
            weight: { type: ["number", "string"] },
            volume: { type: ["number", "string"] },
            originCity: { type: "string" },
            destinationCity: { type: "string" },
            deliveryType: { type: "string", enum: ["air", "road", "express"] },
            cargoName: { type: ["string", "null"] },
          },
          required: ["weight", "volume", "deliveryType"],
        },
      },
    },
    async (req, reply) => {
      try {
        const { weight, volume, originCity, destinationCity, deliveryType, cargoName } = req.body;

        // Валидация входных данных
        const w = Number(weight);
        const v = Number(volume);

        if (!Number.isFinite(w) || w <= 0) {
          return reply.badRequest("Вес должен быть положительным числом");
        }
        if (!Number.isFinite(v) || v <= 0) {
          return reply.badRequest("Объём должен быть положительным числом");
        }
        if (!["air", "road", "express"].includes(deliveryType)) {
          return reply.badRequest("Тип доставки должен быть: air, road или express");
        }

        const estimate = calculateEstimate({
          weight: w,
          volume: v,
          deliveryType,
          originCity,
          destinationCity,
        });

        return {
          ...estimate,
          calculatorPayload: {
            weight: w,
            volume: v,
            originCity: originCity || null,
            destinationCity: destinationCity || null,
            deliveryType,
            cargoName: cargoName || null,
          },
        };
      } catch (err) {
        app.log.error({ tag: "CALCULATE_ERROR", err }, "POST /public/calculate failed");
        return reply.code(500).send({ error: "calculate_failed", message: err?.message || String(err) });
      }
    }
  );

  // === Создание лида (публичное) ===
  app.post(
    "/leads",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      schema: {
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1 },
            phone: { type: "string", minLength: 5 },
            company: { type: ["string", "null"] },
            email: { type: ["string", "null"] },
            note: { type: ["string", "null"] },
            // Calculator fields
            cargoName: { type: ["string", "null"] },
            weight: { type: ["number", "string"] },
            volume: { type: ["number", "string"] },
            originCity: { type: ["string", "null"] },
            destinationCity: { type: ["string", "null"] },
            deliveryType: { type: "string", enum: ["air", "road", "express", "economy", "standard", "premium"] },
            // Pre-calculated estimate (optional - if not provided, will be calculated)
            estimatedPrice: { type: ["number", "string", "null"] },
            estimatedCurrency: { type: ["string", "null"] },
            estimatedDaysMin: { type: ["integer", "null"] },
            estimatedDaysMax: { type: ["integer", "null"] },
            // Source and entry point (optional)
            source: { type: "string", enum: ["website_calculator", "prolife_site", "external_site"] },
            leadEntryPoint: { type: "string", enum: ["calculator", "contact_form", "lab_calculator"] },
            // UTM fields (optional)
            utmSource: { type: ["string", "null"] },
            utmMedium: { type: ["string", "null"] },
            utmCampaign: { type: ["string", "null"] },
            utmContent: { type: ["string", "null"] },
            // Honeypot field (hidden, should be empty)
            website: { type: ["string", "null"] },
          },
          required: ["name", "phone", "weight", "volume", "deliveryType"],
        },
      },
    },
    async (req, reply) => {
      try {
        const b = req.body;

        // 🍯 HONEYPOT: Если поле website заполнено — это бот
        if (b.website && String(b.website).trim().length > 0) {
          // Возвращаем фейковый успех, чтобы не раскрывать защиту
          app.log.warn({ tag: "HONEYPOT_BLOCKED", ip: req.ip, body: b }, "Bot submission blocked by honeypot");
          return {
            success: true,
            leadId: null,
            message: "Заявка принята. Мы свяжемся с вами.",
          };
        }

        // Валидация
        const name = String(b.name || "").trim();
        const phone = String(b.phone || "").trim();

        if (!name) return reply.badRequest("Имя обязательно");
        if (!phone || phone.length < 5) return reply.badRequest("Телефон обязателен (минимум 5 символов)");

        const w = Number(b.weight);
        const v = Number(b.volume);
        if (!Number.isFinite(w) || w <= 0) return reply.badRequest("Вес должен быть положительным числом");
        if (!Number.isFinite(v) || v <= 0) return reply.badRequest("Объём должен быть положительным числом");

        const deliveryType = b.deliveryType;
        // Valid delivery types: legacy (air/road/express) + Prolife v1 (economy/standard/premium)
        const validDeliveryTypes = ["air", "road", "express", "economy", "standard", "premium"];
        if (!validDeliveryTypes.includes(deliveryType)) {
          return reply.badRequest("Тип доставки должен быть: air, road, express, economy, standard или premium");
        }

        // Расчёт или использование предоставленной оценки
        let estimate;
        if (b.estimatedPrice != null) {
          estimate = {
            estimatedPrice: Number(b.estimatedPrice),
            estimatedCurrency: b.estimatedCurrency || "USD",
            estimatedDaysMin: Number(b.estimatedDaysMin) || 0,
            estimatedDaysMax: Number(b.estimatedDaysMax) || 0,
          };
        } else {
          estimate = calculateEstimate({
            weight: w,
            volume: v,
            deliveryType,
            originCity: b.originCity,
            destinationCity: b.destinationCity,
          });
        }

        const calculatorSnapshot = {
          input: {
            weight: w,
            volume: v,
            originCity: b.originCity || null,
            destinationCity: b.destinationCity || null,
            deliveryType,
            cargoName: b.cargoName || null,
          },
          result: estimate,
          calculatedAt: new Date().toISOString(),
        };

        // Определяем источник лида (из body с приоритетом, затем заголовок/query)
        const leadSource = getLeadSource(req, b.source);

        const [lead] = await db
          .insert(leads)
          .values({
            name,
            phone,
            company: b.company || null,
            email: b.email || null,
            note: b.note || null,
            source: leadSource,
            leadEntryPoint: b.leadEntryPoint || null,
            utmSource: b.utmSource || null,
            utmMedium: b.utmMedium || null,
            utmCampaign: b.utmCampaign || null,
            utmContent: b.utmContent || null,
            status: "new",
            cargoName: b.cargoName || null,
            weight: w.toFixed(3),
            volume: v.toFixed(3),
            originCity: b.originCity || null,
            destinationCity: b.destinationCity || null,
            deliveryType,
            estimatedPrice: estimate.estimatedPrice.toFixed(2),
            estimatedCurrency: estimate.estimatedCurrency,
            estimatedDaysMin: estimate.estimatedDaysMin,
            estimatedDaysMax: estimate.estimatedDaysMax,
            calculatorSnapshot,
          })
          .returning();

        return { success: true, leadId: lead.id, message: "Заявка принята. Мы свяжемся с вами." };
      } catch (err) {
        app.log.error({ tag: "CREATE_LEAD_ERROR", err }, "POST /leads failed");
        return reply.code(500).send({ error: "create_lead_failed", message: err?.message || String(err) });
      }
    }
  );

  // =========================
  // Приватные эндпоинты (требуют авторизации)
  // =========================

  // === Список лидов ===
  app.get("/leads", { preHandler: app.authGuard }, async (req, reply) => {
    try {
      const { status, limit = 100, offset = 0 } = req.query;

      let query = db
        .select({
          lead: leads,
          manager: { id: users.id, name: users.name },
          client: { id: clients.id, name: clients.name },
        })
        .from(leads)
        .leftJoin(users, eq(leads.managerId, users.id))
        .leftJoin(clients, eq(leads.clientId, clients.id));

      if (status) {
        query = query.where(eq(leads.status, status));
      }

      const rows = await query
        .orderBy(desc(leads.createdAt))
        .limit(Number(limit))
        .offset(Number(offset));

      return rows.map(({ lead, manager, client }) => ({
        ...lead,
        manager: manager?.id ? manager : null,
        client: client?.id ? client : null,
      }));
    } catch (err) {
      app.log.error({ tag: "LIST_LEADS_ERROR", err }, "GET /leads failed");
      return reply.code(500).send({ error: "list_leads_failed", message: err?.message || String(err) });
    }
  });

  // === Получить один лид ===
  app.get("/leads/:id", { preHandler: app.authGuard }, async (req, reply) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return reply.badRequest("Некорректный id");

      const rows = await db
        .select({
          lead: leads,
          manager: { id: users.id, name: users.name, email: users.email, phone: users.phone },
          client: { id: clients.id, name: clients.name, phone: clients.phone, company: clients.company },
          convertedPl: { id: pl.id, plNumber: pl.plNumber, name: pl.name },
        })
        .from(leads)
        .leftJoin(users, eq(leads.managerId, users.id))
        .leftJoin(clients, eq(leads.clientId, clients.id))
        .leftJoin(pl, eq(leads.convertedPlId, pl.id))
        .where(eq(leads.id, id))
        .limit(1);

      if (!rows.length) return reply.notFound("Лид не найден");

      const { lead, manager, client, convertedPl } = rows[0];
      return {
        ...lead,
        manager: manager?.id ? manager : null,
        client: client?.id ? client : null,
        convertedPl: convertedPl?.id ? convertedPl : null,
      };
    } catch (err) {
      app.log.error({ tag: "GET_LEAD_ERROR", err }, "GET /leads/:id failed");
      return reply.code(500).send({ error: "get_lead_failed", message: err?.message || String(err) });
    }
  });

  // === Обновление лида ===
  app.patch("/leads/:id", { preHandler: app.authGuard }, async (req, reply) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return reply.badRequest("Некорректный id");

      const b = req.body || {};
      const allowedFields = ["name", "phone", "company", "email", "note", "status", "managerId"];
      const patch = {};

      for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(b, field)) {
          patch[field] = b[field];
        }
      }

      if (Object.keys(patch).length === 0) {
        return reply.badRequest("Нет данных для обновления");
      }

      // Проверка статуса
      if (patch.status && !["new", "contacted", "qualified", "converted", "lost"].includes(patch.status)) {
        return reply.badRequest("Некорректный статус");
      }

      const [updated] = await db
        .update(leads)
        .set(patch)
        .where(eq(leads.id, id))
        .returning();

      if (!updated) return reply.notFound("Лид не найден");

      return updated;
    } catch (err) {
      app.log.error({ tag: "UPDATE_LEAD_ERROR", err }, "PATCH /leads/:id failed");
      return reply.code(500).send({ error: "update_lead_failed", message: err?.message || String(err) });
    }
  });

  // === Preview конвертации лида в PL ===
  app.get("/leads/:id/convert-preview", { preHandler: app.authGuard }, async (req, reply) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return reply.status(400).send({
          error: "INVALID_ID",
          message: "Некорректный id",
        });
      }

      // Get lead
      const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);

      if (!lead) {
        return reply.status(404).send({
          error: "LEAD_NOT_FOUND",
          message: "Лид не найден",
        });
      }

      // Check if already converted
      const isAlreadyConverted = lead.status === "converted" || lead.convertedPlId != null;

      // Normalize phone for matching
      const normalizedPhone = normalizePhone(lead.phone);

      // Find exact phone matches using normalized comparison
      // These are SUGGESTIONS based on phone number similarity
      let exactPhoneMatches = [];
      if (normalizedPhone) {
        exactPhoneMatches = await findClientsByNormalizedPhone(db, normalizedPhone);
      }

      // existingLinks: ONLY the client already linked to this lead via lead.clientId
      // This is the ACTUAL database relationship, not a suggestion
      let existingLink = null;
      if (lead.clientId) {
        const [linkedClient] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, lead.clientId))
          .limit(1);
        existingLink = linkedClient || null;
      }

      // Proposed new client data
      const proposedNewClient = buildProposedClientFromLead(lead);

      return {
        lead: {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          company: lead.company,
          email: lead.email,
          cargoName: lead.cargoName,
          weight: lead.weight,
          volume: lead.volume,
          originCity: lead.originCity,
          destinationCity: lead.destinationCity,
          estimatedPrice: lead.estimatedPrice,
          status: lead.status,
          convertedPlId: lead.convertedPlId,
        },
        existingLink,  // Single linked client or null (semantic: actual DB relationship)
        exactPhoneMatches,  // Array of suggestions (semantic: phone-based suggestions)
        counts: {
          hasExistingLink: existingLink !== null,
          exactPhoneMatchCount: exactPhoneMatches.length,
          isAlreadyConverted,
        },
        proposedNewClient,
        normalizedPhone,
      };
    } catch (err) {
      app.log.error({ tag: "CONVERT_PREVIEW_ERROR", err }, "GET /leads/:id/convert-preview failed");
      return reply.code(500).send({ error: "convert_preview_failed", message: err?.message || String(err) });
    }
  });

  // === Конвертация лида в PL (transaction-safe) ===
  app.post("/leads/:id/convert-to-pl", { preHandler: app.authGuard }, async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return reply.status(400).send({
        error: "INVALID_ID",
        message: "Некорректный id",
      });
    }

    // Access user info for logging
    const userId = req.user?.id;
    const body = req.body || {};

    // LEGACY BEHAVIOR RULES (transitional backward compatibility):
    // 1. missing clientResolution property → LEGACY MODE (deprecated, logs warning)
    // 2. null clientResolution → ERROR: CLIENT_RESOLUTION_REQUIRED
    // 3. empty object {} → ERROR: CLIENT_RESOLUTION_REQUIRED (no mode specified)
    // 4. valid mode specified → EXPLICIT MODE (preferred)
    
    const hasClientResolutionProp = Object.prototype.hasOwnProperty.call(body, "clientResolution");
    const clientResolution = body.clientResolution;
    
    // Case 2 & 3: null or empty object → require explicit resolution
    if (hasClientResolutionProp && (!clientResolution || !clientResolution.mode)) {
      return reply.status(400).send({
        error: "CLIENT_RESOLUTION_REQUIRED",
        message: "clientResolution с указанием mode обязателен (existing или new)",
      });
    }
    
    // isExplicitMode = has valid mode specified
    const isExplicitMode = clientResolution && (clientResolution.mode === "existing" || clientResolution.mode === "new");

    try {
      // Use transaction for all DB operations
      const result = await db.transaction(async (tx) => {
        // 1. Lock lead for update (concurrency protection)
        const [lead] = await tx
          .select()
          .from(leads)
          .where(eq(leads.id, id))
          .for("update")
          .limit(1);

        if (!lead) {
          return { error: "LEAD_NOT_FOUND", status: 404, message: "Лид не найден" };
        }

        // 2. Check if already converted (idempotency protection)
        if (lead.status === "converted" || lead.convertedPlId != null) {
          return {
            error: "LEAD_ALREADY_CONVERTED",
            status: 409,
            message: "Лид уже конвертирован",
            convertedPlId: lead.convertedPlId,
          };
        }

        let clientId;

        // === EXPLICIT CLIENT RESOLUTION MODE ===
        if (isExplicitMode) {
          if (clientResolution.mode === "existing") {
            // Use existing client
            if (!clientResolution.clientId) {
              return {
                error: "CLIENT_ID_REQUIRED",
                status: 400,
                message: "clientId обязателен при mode=existing",
              };
            }

            const [existingClient] = await tx
              .select()
              .from(clients)
              .where(eq(clients.id, clientResolution.clientId))
              .limit(1);

            if (!existingClient) {
              return {
                error: "CLIENT_NOT_FOUND",
                status: 404,
                message: "Указанный клиент не найден",
              };
            }

            clientId = existingClient.id;
          } else if (clientResolution.mode === "new") {
            // Create new client (ALWAYS creates new, even if phone matches)
            if (!clientResolution.client) {
              return {
                error: "CLIENT_PAYLOAD_REQUIRED",
                status: 400,
                message: "client обязателен при mode=new",
              };
            }

            const clientData = clientResolution.client;
            if (!clientData.name || String(clientData.name).trim() === "") {
              return {
                error: "CLIENT_NAME_REQUIRED",
                status: 400,
                message: "Имя клиента обязательно",
              };
            }

            const [newClient] = await tx
              .insert(clients)
              .values({
                name: String(clientData.name).trim(),
                phone: clientData.phone || lead.phone || null,
                company: clientData.company || lead.company || null,
                email: clientData.email || lead.email || null,
                notes: clientData.notes || null,
                normalizedName: String(clientData.name).toLowerCase().trim(),
              })
              .returning();

            clientId = newClient.id;
          } else {
            return {
              error: "INVALID_CLIENT_RESOLUTION_MODE",
              status: 400,
              message: "Режим разрешения клиента должен быть 'existing' или 'new'",
            };
          }
        } else {
          // === LEGACY FALLBACK MODE (DEPRECATED) ===
          // Only reaches here if clientResolution property is completely missing
          app.log.warn({
            tag: "DEPRECATED_CONVERSION",
            leadId: id,
            userId,
            message: "Legacy conversion without clientResolution used",
          });

          // Use legacy auto-resolution with normalized phone matching
          if (lead.clientId) {
            clientId = lead.clientId;
          } else {
            // Search by normalized phone
            const normalizedPhone = normalizePhone(lead.phone);
            const phoneMatches = normalizedPhone
              ? await findClientsByNormalizedPhone(tx, normalizedPhone)
              : [];

            if (phoneMatches.length > 0) {
              clientId = phoneMatches[0].id;
            } else {
              // Create new client
              const [newClient] = await tx
                .insert(clients)
                .values({
                  name: lead.name,
                  phone: lead.phone,
                  company: lead.company || null,
                  email: lead.email || null,
                  normalizedName: lead.name.toLowerCase().trim(),
                })
                .returning();
              clientId = newClient.id;
            }
          }
        }

        // 3. Create PL
        const plName = lead.cargoName || `Груз от ${lead.name}`;
        const [createdPl] = await tx
          .insert(pl)
          .values({
            name: plName,
            clientId: clientId,
            weight: lead.weight,
            volume: lead.volume,
            status: "draft",
            clientPrice: lead.estimatedPrice || null,
            calculator: lead.calculatorSnapshot || {},
            pickupAddress: lead.originCity || null,
          })
          .returning({ id: pl.id, createdAt: pl.createdAt });

        // Generate PL number
        const year = createdPl.createdAt ? new Date(createdPl.createdAt).getFullYear() : new Date().getFullYear();
        const plNumber = `PL-${year}-${createdPl.id}`;
        await tx.update(pl).set({ plNumber }).where(eq(pl.id, createdPl.id));

        // 4. Update lead
        const [updatedLead] = await tx
          .update(leads)
          .set({
            status: "converted",
            clientId: clientId,
            convertedPlId: createdPl.id,
            managerId: userId || null,
          })
          .where(eq(leads.id, id))
          .returning();

        return {
          success: true,
          lead: updatedLead,
          pl: {
            id: createdPl.id,
            plNumber,
          },
          clientId,
        };
      });

      // Handle transaction result
      if (result.error) {
        return reply.status(result.status).send({
          error: result.error,
          message: result.message,
          ...(result.convertedPlId && { convertedPlId: result.convertedPlId }),
        });
      }

      // Fetch full PL data for response
      const [fullPl] = await db
        .select({ p: pl, c: clients })
        .from(pl)
        .leftJoin(clients, eq(pl.clientId, clients.id))
        .where(eq(pl.id, result.pl.id))
        .limit(1);

      return {
        success: true,
        message: "Лид успешно конвертирован в PL",
        lead: result.lead,
        pl: {
          ...fullPl.p,
          client: fullPl.c,
        },
        clientId: result.clientId,
      };
    } catch (err) {
      app.log.error({ tag: "CONVERT_LEAD_ERROR", err, leadId: id, userId }, "POST /leads/:id/convert-to-pl failed");
      return reply.code(500).send({ error: "convert_lead_failed", message: err?.message || String(err) });
    }
  });

  // === Удаление лида ===
  app.delete("/leads/:id", { preHandler: app.authGuard }, async (req, reply) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return reply.badRequest("Некорректный id");

      const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
      if (!lead) return reply.notFound("Лид не найден");

      // Не удаляем сконвертированные лиды
      if (lead.status === "converted" && lead.convertedPlId) {
        return reply.status(409).send({
          error: "CANNOT_DELETE_CONVERTED",
          message: "Нельзя удалить сконвертированный лид. Сначала удалите связанный PL.",
        });
      }

      await db.delete(leads).where(eq(leads.id, id));
      return reply.status(204).send();
    } catch (err) {
      app.log.error({ tag: "DELETE_LEAD_ERROR", err }, "DELETE /leads/:id failed");
      return reply.code(500).send({ error: "delete_lead_failed", message: err?.message || String(err) });
    }
  });
}
