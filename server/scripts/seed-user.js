// server/scripts/seed-user.js
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import bcrypt from 'bcryptjs';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).flatMap((arg) => {
      // --key=value  или  --key value
      if (arg.startsWith('--') && arg.includes('=')) {
        const [k, v] = arg.slice(2).split('=');
        return [[k, v]];
      }
      return [];
    })
  );

  // также поддержим форму --key value
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--') && !argv[i].includes('=')) {
      const k = argv[i].slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '';
      if (!(k in args)) args[k] = v;
    }
  }
  return args;
}

async function main() {
  const { login, password, name = 'Пользователь', email = null, phone = null, role = 'user' } = parseArgs();

  if (!login || !password) {
    console.error('Usage: node server/scripts/seed-user.js --login admin --password secret [--name "Админ"] [--email admin@example.com] [--phone +996...] [--role admin]');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { prepare: true });
  const db = drizzle(sql);

  try {
    const [exists] = await db.select().from(users).where(eq(users.login, login)).limit(1);
    const passwordHash = await bcrypt.hash(password, 10);

    if (exists) {
      await db.update(users).set({ passwordHash, name, email, phone, role }).where(eq(users.id, exists.id));
      console.log(`✅ Обновил пользователя "${login}" (role=${role}).`);
    } else {
      await db.insert(users).values({ login, passwordHash, name, email, phone, role });
      console.log(`✅ Создал пользователя "${login}" (role=${role}).`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});