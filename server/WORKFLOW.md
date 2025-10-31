# WORKFLOW

## Локальная разработка
npm run generate
npm run migrate:local
npm run dev

## Staging
# генерим миграцию локально → пушим в Git
npm run generate
git add server/drizzle
git commit -m "migration"
# на стейдже (или в Render Build Command):
npm run migrate:staging

## Production (ручной, безопасный)
# миграцию сгенерить локально и запушить в репо
npm run generate
git add server/drizzle
git commit -m "prod migration"
# на проде:
CONFIRM_PROD=YES NODE_ENV=production npm run migrate:production