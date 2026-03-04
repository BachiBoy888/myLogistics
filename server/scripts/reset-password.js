import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

const password = 'admin123';
const hash = await bcrypt.hash(password, 10);
console.log('Creating user with hash:', hash);

await sql`UPDATE users SET password_hash = ${hash} WHERE login = 'admin'`;
console.log('Password updated successfully');

await sql.end();
