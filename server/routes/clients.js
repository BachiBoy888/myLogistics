// server/routes/clients.js
import { db } from '../db/index.js';
import { clients } from '../db/schema.js';

export default async function clientsRoutes(fastify) {
  // Список клиентов
  fastify.get('/clients', async () => {
    return await db.select().from(clients);
  });

  // Создать клиента
  fastify.post('/clients', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          phone: { type: 'string', nullable: true },
          company: { type: 'string', nullable: true },
        },
        additionalProperties: false,
      }
    }
  }, async (req) => {
    const { name, phone, company } = req.body;
    const [row] = await db.insert(clients).values({ name, phone, company }).returning();
    return row;
  });
}
