import 'dotenv/config';

export default {
  schema: './db/schema.js',
  out: './drizzle', // куда сохраняются миграции
  dialect: 'postgresql', // 🔥 новое свойство (вместо driver: 'pg')
  dbCredentials: {
    url: process.env.DATABASE_URL, // строка подключения из .env
  },
};