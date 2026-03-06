// server/bootstrap/env.js
import dotenvFlow from "dotenv-flow";

// Сохраняем заранее переданные переменные окружения,
// чтобы dotenv-flow не перетирал их.
const preserved = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES: process.env.JWT_EXPIRES,
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  NODE_ENV: process.env.NODE_ENV,
};

dotenvFlow.config({
  path: process.cwd(),
  silent: true,
});

// Возвращаем внешне переданные значения обратно
for (const [key, value] of Object.entries(preserved)) {
  if (value !== undefined && value !== "") {
    process.env[key] = value;
  }
}

const stage = process.env.NODE_ENV || "development";
console.log(`[env] Загружены переменные для NODE_ENV="${stage}"`);



