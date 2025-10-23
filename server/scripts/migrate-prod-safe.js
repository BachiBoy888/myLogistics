// server/scripts/migrate-prod-safe.js
// Безопасный запуск миграций на проде:
// 1) Требует NODE_ENV=production
// 2) Требует CONFIRM_PROD=YES
// 3) Требует DATABASE_URL (из окружения)
// Запуск: CONFIRM_PROD=YES NODE_ENV=production npm run migrate:production

import { execSync } from "node:child_process";

const { NODE_ENV, DATABASE_URL, CONFIRM_PROD } = process.env;

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

if (NODE_ENV !== "production") {
  fail('NODE_ENV должен быть "production" для прод-миграций.');
}
if (!DATABASE_URL) {
  fail("Не найден DATABASE_URL в окружении (Render/ENV Vars).");
}
if (CONFIRM_PROD !== "YES") {
  fail('Для подтверждения добавьте переменную окружения: CONFIRM_PROD=YES');
}

console.log("▶ Запускаю drizzle-kit migrate (prod)...");
try {
  execSync("npx drizzle-kit migrate", { stdio: "inherit" });
  console.log("✔ Миграции на проде успешно выполнены.");
} catch (e) {
  fail("drizzle-kit migrate завершился с ошибкой.");
}