// server/routes/import.js
// Импорт клиентов и PL из Excel

import * as XLSX from 'xlsx';
import { eq, sql } from 'drizzle-orm';
import { clients, pl, plEvents } from '../db/schema.js';

// Нормализация строки для сравнения
function normalizeStr(str = '') {
  return String(str || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// Поиск клиента по имени (только по имени, компания игнорируется)
async function findExistingClient(db, { name, phone, email }) {
  const normalizedName = normalizeStr(name);
  
  // Ищем по exact match name
  if (name) {
    const [byName] = await db
      .select()
      .from(clients)
      .where(sql`LOWER(TRIM(${clients.name})) = ${normalizedName}`)
      .limit(1);
    if (byName) return { client: byName, matchType: 'точное совпадение по имени' };
  }

  // Ищем по phone
  if (phone) {
    const [byPhone] = await db
      .select()
      .from(clients)
      .where(sql`REPLACE(REPLACE(REPLACE(${clients.phone}, '-', ''), ' ', ''), '+', '') = REPLACE(REPLACE(REPLACE(${phone}, '-', ''), ' ', ''), '+', '')`)
      .limit(1);
    if (byPhone) return { client: byPhone, matchType: 'телефон' };
  }

  // Ищем по email
  if (email) {
    const [byEmail] = await db
      .select()
      .from(clients)
      .where(sql`LOWER(TRIM(${clients.email})) = ${normalizeStr(email)}`)
      .limit(1);
    if (byEmail) return { client: byEmail, matchType: 'email' };
  }

  return null;
}

// Поиск клиента по ID
async function findClientById(db, id) {
  if (!id) return null;
  const [existing] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);
  return existing;
}

// Поиск PL по ID
async function findPLById(db, id) {
  if (!id) return null;
  const [existing] = await db
    .select()
    .from(pl)
    .where(eq(pl.id, id))
    .limit(1);
  return existing;
}

// Поиск PL по номеру
async function findExistingPL(db, plNumber) {
  if (!plNumber) return null;
  const [existing] = await db
    .select()
    .from(pl)
    .where(sql`LOWER(TRIM(${pl.plNumber})) = ${normalizeStr(plNumber)}`)
    .limit(1);
  return existing;
}

// Парсинг Excel файла
function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  
  if (data.length < 2) return { headers: [], rows: [] };
  
  const headers = data[0].map(h => String(h || '').trim());
  const rows = data.slice(1).map((row, idx) => ({
    rowIndex: idx + 2, // Номер строки в Excel (1-based + header)
    data: row,
  }));
  
  return { headers, rows };
}

// Извлечение значения из строки по заголовку
function getValue(row, headers, possibleNames) {
  for (const name of possibleNames) {
    const idx = headers.findIndex(h => 
      normalizeStr(h) === normalizeStr(name) || 
      h.toLowerCase().includes(name.toLowerCase())
    );
    if (idx >= 0 && row[idx] !== undefined && row[idx] !== '') {
      return String(row[idx]).trim();
    }
  }
  return '';
}

// Преобразование строки Excel в объект клиента
function rowToClient(row, headers) {
  const idStr = getValue(row, headers, ['ID клиента', 'Client ID', 'ID']);
  return {
    id: idStr ? parseInt(idStr) || null : null,
    name: getValue(row, headers, ['Клиент', 'Имя клиента', 'Name', 'Клиент name']),
    phone: getValue(row, headers, ['Телефон', 'Phone', 'Тел']),
    phone2: getValue(row, headers, ['Телефон 2', 'Phone 2', 'Доп. телефон']),
    email: getValue(row, headers, ['Email', 'Почта', 'E-mail', 'email']),
    notes: getValue(row, headers, ['Примечания', 'Notes', 'Комментарии', 'Примечание']),
  };
}

// Преобразование строки Excel в объект PL
function rowToPL(row, headers) {
  const weightStr = getValue(row, headers, ['Вес (кг)', 'Вес', 'Weight', 'Weight kg']);
  const volumeStr = getValue(row, headers, ['Объём (м³)', 'Объем', 'Volume', 'Объём']);
  const placesStr = getValue(row, headers, ['Количество мест', 'Мест', 'Places', 'Кол-во мест']);
  const clientPriceStr = getValue(row, headers, ['Цена клиента', 'Цена', 'Client price', 'Price']);
  const plIdStr = getValue(row, headers, ['ID PL', 'PL ID']);
  const clientIdStr = getValue(row, headers, ['ID клиента', 'Client ID']);
  
  // Парсим числа с учетом русского формата (запятая)
  const parseNum = (s) => {
    if (!s) return null;
    const cleaned = String(s).replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  };

  return {
    id: plIdStr ? parseInt(plIdStr) || null : null,
    clientId: clientIdStr ? parseInt(clientIdStr) || null : null,
    plNumber: getValue(row, headers, ['Номер PL', 'PL Number', 'Номер', 'PL']),
    name: getValue(row, headers, ['Название груза', 'Груз', 'Cargo name', 'Name']),
    weight: parseNum(weightStr),
    volume: parseNum(volumeStr),
    places: parseInt(placesStr) || 1,
    incoterm: getValue(row, headers, ['Инкотерм', 'Incoterm', 'Условия']),
    pickupAddress: getValue(row, headers, ['Адрес забора', 'Адрес', 'Pickup address', 'Откуда']),
    shipperName: getValue(row, headers, ['Отправитель', 'Shipper', 'Грузоотправитель']),
    shipperContacts: getValue(row, headers, ['Контакты отправителя', 'Контакты', 'Shipper contacts']),
    status: getValue(row, headers, ['Статус', 'Status']) || 'draft',
    clientPrice: parseNum(clientPriceStr),
  };
}

export default async function importRoutes(fastify) {
  const db = fastify.drizzle;

  // ===== Предпросмотр импорта =====
  fastify.post('/preview', { preHandler: fastify.authGuard }, async (req, reply) => {
    try {
      const file = await req.file();
      if (!file) return reply.badRequest('Файл не загружен');
      
      const buffer = await file.toBuffer();
      const { headers, rows } = parseExcel(buffer);
      
      if (rows.length === 0) {
        return reply.badRequest('Файл пуст или не содержит данных');
      }

      const preview = {
        clients: [],
        pls: [],
        summary: { totalRows: rows.length, newClients: 0, existingClients: 0, newPLs: 0, existingPLs: 0 },
      };

      // Собираем уникальных клиентов из файла (по имени, без учета компании)
      const clientMap = new Map(); // key (name) -> { data, rows: [] }
      
      for (const { rowIndex, data } of rows) {
        const clientData = rowToClient(data, headers);
        if (!clientData.name) continue;
        
        const key = normalizeStr(clientData.name);
        if (!clientMap.has(key)) {
          clientMap.set(key, { data: clientData, rows: [] });
        }
        clientMap.get(key).rows.push(rowIndex);
      }

      // Проверяем клиентов на конфликты (по ID, затем по имени)
      for (const [key, { data, rows: rowIndices }] of clientMap) {
        let existing = null;
        let matchType = null;
        
        // Сначала проверяем по ID
        if (data.id) {
          const byId = await findClientById(db, data.id);
          if (byId) {
            existing = byId;
            matchType = 'ID';
          }
        }
        
        // Если не нашли по ID, ищем по имени/телефону/email
        if (!existing) {
          const found = await findExistingClient(db, data);
          if (found) {
            existing = found.client;
            matchType = found.matchType;
          }
        }
        
        if (existing) {
          preview.summary.existingClients++;
          preview.clients.push({
            type: 'conflict',
            action: 'skip', // default
            data,
            existing,
            matchType,
            rowIndices,
          });
        } else {
          preview.summary.newClients++;
          preview.clients.push({
            type: 'new',
            action: 'create',
            data,
            rowIndices,
          });
        }
      }

      // Проверяем PL на конфликты (по ID, затем по номеру)
      for (const { rowIndex, data: rowData } of rows) {
        const plData = rowToPL(rowData, headers);
        // Пропускаем строки без номера PL и без названия груза
        if (!plData.name && !plData.plNumber && !plData.id) continue;

        let existing = null;
        let conflictBy = null;
        
        // Сначала проверяем по ID PL
        if (plData.id) {
          const byId = await findPLById(db, plData.id);
          if (byId) {
            existing = byId;
            conflictBy = 'ID PL';
          }
        }
        
        // Если не нашли по ID, ищем по номеру PL
        if (!existing && plData.plNumber) {
          const byNumber = await findExistingPL(db, plData.plNumber);
          if (byNumber) {
            existing = byNumber;
            conflictBy = 'номер PL';
          }
        }
        
        // Находим клиента для этого PL
        const clientData = rowToClient(rowData, headers);
        const clientKey = normalizeStr(clientData.name);

        if (existing) {
          preview.summary.existingPLs++;
          preview.pls.push({
            type: 'conflict',
            action: 'skip',
            data: plData,
            existing,
            clientKey,
            rowIndex,
            conflictBy,
            // Добавляем возможность смены клиента
            canMoveClient: existing.clientId !== plData.clientId && plData.clientId !== null,
          });
        } else {
          preview.summary.newPLs++;
          preview.pls.push({
            type: 'new',
            action: 'create',
            data: plData,
            clientKey,
            rowIndex,
          });
        }
      }

      return preview;
    } catch (err) {
      req.log.error(err, 'Import preview failed');
      return reply.status(500).send({ error: 'Preview failed', detail: err.message });
    }
  });

  // ===== Применение импорта =====
  fastify.post('/apply', { preHandler: fastify.authGuard }, async (req, reply) => {
    try {
      const { clients: clientActions, pls: plActions } = req.body || {};
      
      if (!Array.isArray(clientActions) || !Array.isArray(plActions)) {
        return reply.badRequest('Invalid request format');
      }

      const results = {
        clients: { created: [], updated: [], skipped: [], errors: [] },
        pls: { created: [], updated: [], skipped: [], errors: [] },
      };

      // Обрабатываем клиентов (без сохранения company)
      const clientIdMap = new Map(); // key (name) -> id (существующий или созданный)
      
      for (const action of clientActions) {
        const { type, action: operation, data, existing } = action;
        const key = normalizeStr(data.name);

        try {
          if (type === 'new' && operation === 'create') {
            const [inserted] = await db
              .insert(clients)
              .values({
                name: data.name,
                phone: data.phone || null,
                phone2: data.phone2 || null,
                email: data.email || null,
                notes: data.notes || null,
                normalizedName: normalizeStr(data.name),
              })
              .returning();
            
            results.clients.created.push({ id: inserted.id, name: inserted.name });
            clientIdMap.set(key, inserted.id);
          } 
          else if (type === 'conflict') {
            if (operation === 'overwrite') {
              const [updated] = await db
                .update(clients)
                .set({
                  name: data.name,
                  phone: data.phone || null,
                  phone2: data.phone2 || null,
                  email: data.email || null,
                  notes: data.notes || null,
                  normalizedName: normalizeStr(data.name),
                })
                .where(eq(clients.id, existing.id))
                .returning();
              
              results.clients.updated.push({ id: updated.id, name: updated.name });
              clientIdMap.set(key, updated.id);
            } 
            else if (operation === 'create_copy') {
              const [inserted] = await db
                .insert(clients)
                .values({
                  name: data.name + ' (imported)',
                  phone: data.phone || null,
                  phone2: data.phone2 || null,
                  email: data.email || null,
                  notes: data.notes || null,
                  normalizedName: normalizeStr(data.name + ' imported'),
                })
                .returning();
              
              results.clients.created.push({ id: inserted.id, name: inserted.name });
              clientIdMap.set(key, inserted.id);
            } 
            else {
              // skip
              results.clients.skipped.push({ id: existing.id, name: existing.name });
              clientIdMap.set(key, existing.id);
            }
          }
        } catch (err) {
          results.clients.errors.push({ data, error: err.message });
        }
      }

      // Обрабатываем PL
      for (const action of plActions) {
        const { type, action: operation, data, existing, clientKey } = action;

        try {
          // Находим clientId (по имени)
          let clientId = clientIdMap.get(clientKey);
          if (!clientId) {
            // Ищем среди существующих клиентов
            const clientData = action.clientData || {};
            const found = await findExistingClient(db, clientData);
            if (found) clientId = found.client.id;
          }

          if (!clientId) {
            results.pls.errors.push({ data, error: 'Client not found' });
            continue;
          }

          if (type === 'new' && operation === 'create') {
            const [inserted] = await db
              .insert(pl)
              .values({
                name: data.name || 'Без названия',
                weight: data.weight,
                volume: data.volume,
                places: data.places || 1,
                clientId,
                incoterm: data.incoterm || null,
                pickupAddress: data.pickupAddress || null,
                shipperName: data.shipperName || null,
                shipperContacts: data.shipperContacts || null,
                status: data.status || 'draft',
                clientPrice: data.clientPrice || 0,
                calculator: {},
              })
              .returning({ id: pl.id, createdAt: pl.createdAt });

            const year = inserted.createdAt
              ? new Date(inserted.createdAt).getFullYear()
              : new Date().getFullYear();
            const plNumber = data.plNumber || `PL-${year}-${inserted.id}`;
            
            const [saved] = await db
              .update(pl)
              .set({ plNumber })
              .where(eq(pl.id, inserted.id))
              .returning();

            // Событие создания
            await db.insert(plEvents).values({
              plId: saved.id,
              type: 'pl.created',
              message: 'PL создан через импорт',
              meta: { source: 'import', pl_number: plNumber },
              actorUserId: req.user?.id ?? null,
            });

            results.pls.created.push({ id: saved.id, plNumber: saved.plNumber });
          } 
          else if (type === 'conflict') {
            // Находим clientId для возможной смены клиента
            let newClientId = clientIdMap.get(clientKey);
            if (!newClientId) {
              const clientData = action.clientData || {};
              const found = await findExistingClient(db, clientData);
              if (found) newClientId = found.client.id;
            }

            if (operation === 'overwrite') {
              const updateData = {
                name: data.name || existing.name,
                weight: data.weight ?? existing.weight,
                volume: data.volume ?? existing.volume,
                places: data.places ?? existing.places,
                incoterm: data.incoterm ?? existing.incoterm,
                pickupAddress: data.pickupAddress ?? existing.pickupAddress,
                shipperName: data.shipperName ?? existing.shipperName,
                shipperContacts: data.shipperContacts ?? existing.shipperContacts,
                status: data.status ?? existing.status,
                clientPrice: data.clientPrice ?? existing.clientPrice,
              };
              
              // Если указан новый клиент и он отличается от текущего - меняем клиента
              if (newClientId && newClientId !== existing.clientId) {
                updateData.clientId = newClientId;
              }
              
              const [updated] = await db
                .update(pl)
                .set(updateData)
                .where(eq(pl.id, existing.id))
                .returning();

              results.pls.updated.push({ id: updated.id, plNumber: updated.plNumber, clientChanged: !!updateData.clientId });
            } 
            else if (operation === 'move_client') {
              // Только смена клиента без изменения данных PL
              if (newClientId && newClientId !== existing.clientId) {
                const [updated] = await db
                  .update(pl)
                  .set({ clientId: newClientId })
                  .where(eq(pl.id, existing.id))
                  .returning();

                // Событие смены клиента
                await db.insert(plEvents).values({
                  plId: updated.id,
                  type: 'pl.client_changed',
                  message: 'Клиент PL изменен через импорт',
                  meta: { source: 'import', old_client_id: existing.clientId, new_client_id: newClientId },
                  actorUserId: req.user?.id ?? null,
                });

                results.pls.updated.push({ id: updated.id, plNumber: updated.plNumber, clientChanged: true });
              } else {
                results.pls.skipped.push({ id: existing.id, plNumber: existing.plNumber });
              }
            }
            else if (operation === 'create_copy') {
              const [inserted] = await db
                .insert(pl)
                .values({
                  name: (data.name || 'Без названия') + ' (imported)',
                  weight: data.weight,
                  volume: data.volume,
                  places: data.places || 1,
                  clientId,
                  incoterm: data.incoterm || null,
                  pickupAddress: data.pickupAddress || null,
                  shipperName: data.shipperName || null,
                  shipperContacts: data.shipperContacts || null,
                  status: data.status || 'draft',
                  clientPrice: data.clientPrice || 0,
                  calculator: {},
                })
                .returning({ id: pl.id, createdAt: pl.createdAt });

              const year = inserted.createdAt
                ? new Date(inserted.createdAt).getFullYear()
                : new Date().getFullYear();
              const plNumber = `PL-${year}-${inserted.id}-I`;
              
              const [saved] = await db
                .update(pl)
                .set({ plNumber })
                .where(eq(pl.id, inserted.id))
                .returning();

              await db.insert(plEvents).values({
                plId: saved.id,
                type: 'pl.created',
                message: 'PL создан через импорт (копия)',
                meta: { source: 'import_copy', original_pl: existing.plNumber },
                actorUserId: req.user?.id ?? null,
              });

              results.pls.created.push({ id: saved.id, plNumber: saved.plNumber });
            } 
            else {
              results.pls.skipped.push({ id: existing.id, plNumber: existing.plNumber });
            }
          }
        } catch (err) {
          results.pls.errors.push({ data, error: err.message });
        }
      }

      return results;
    } catch (err) {
      req.log.error(err, 'Import apply failed');
      return reply.status(500).send({ error: 'Apply failed', detail: err.message });
    }
  });
}
