// server/bootstrap/env.js
// Гибкая загрузка .env.* через dotenv-flow
// Работает так:
//   NODE_ENV=development → .env, .env.development, .env.local
//   NODE_ENV=staging     → .env, .env.staging, .env.local
//   NODE_ENV=production  → .env, .env.production
//
// Подключи этот файл самым первым в server.js:
//   import "./bootstrap/env.js";

import dotenvFlow from "dotenv-flow";

dotenvFlow.config({
  // Если нужно, можно явно указать путь до корня:
  // path: process.cwd(),
  // silent: true  // не шуметь при отсутствии файлов
});

const stage = process.env.NODE_ENV || "development";
console.log(`[env] Загружены переменные для NODE_ENV="${stage}"`);