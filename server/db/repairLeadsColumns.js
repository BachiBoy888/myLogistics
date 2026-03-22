/**
 * Runtime repair for leads table columns
 * Guards against journal drift - ensures UTM columns exist on startup
 */

import { sql } from "drizzle-orm";

/**
 * Check and repair missing lead columns
 * Idempotent - safe to call multiple times
 * @param {import('drizzle-orm/node-postgres').db} db
 */
export async function repairLeadsColumns(db) {
  try {
    // Check which columns exist
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'leads' 
      AND column_name IN ('lead_entry_point', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content')
    `);

    const existingColumns = new Set(columns.rows.map(r => r.column_name));
    const requiredColumns = ['lead_entry_point', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
    const missingColumns = requiredColumns.filter(c => !existingColumns.has(c));

    if (missingColumns.length === 0) {
      console.log('[DB Repair] All lead UTM columns exist ✓');
      return { repaired: false, missing: [] };
    }

    console.warn(`[DB Repair] Missing columns detected: ${missingColumns.join(', ')}`);

    // Repair missing columns
    for (const column of missingColumns) {
      console.log(`[DB Repair] Adding column: ${column}`);
      await db.execute(sql.raw(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${column} TEXT`));
    }

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_leads_lead_entry_point ON leads(lead_entry_point)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON leads(utm_source)`);

    console.log('[DB Repair] Columns repaired successfully ✓');
    return { repaired: true, missing: missingColumns };

  } catch (err) {
    console.error('[DB Repair] Failed to repair columns:', err);
    return { repaired: false, error: err.message, missing: requiredColumns };
  }
}
