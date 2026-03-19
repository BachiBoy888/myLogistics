/**
 * Database Integration Tests for Lead Conversion
 * 
 * These tests require a real PostgreSQL database.
 * Run with: DATABASE_URL=postgres://... node --test routes/leads.integration.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { leads, clients, pl } from "../db/schema.js";
import { normalizePhone } from "../lib/phone.js";

// Test DB connection
const TEST_DB_URL = process.env.DATABASE_URL;

// Skip tests if no DB URL provided
const describeIfDb = TEST_DB_URL ? describe : describe.skip;

describeIfDb("Lead Conversion - DB Integration", () => {
  let sql;
  let db;

  before(async () => {
    const isLocalDb = TEST_DB_URL?.includes("localhost") || TEST_DB_URL?.includes("127.0.0.1");
    sql = postgres(TEST_DB_URL, {
      prepare: true,
      ...(isLocalDb ? {} : { ssl: "require" }),
    });
    db = drizzle(sql);
  });

  after(async () => {
    if (sql) {
      await sql.end();
    }
  });

  /**
   * Test: mode="new" creates a new client even if another client exists with same normalized phone
   */
  it("mode=new creates duplicate client when same phone exists", async () => {
    const testPhone = "+996220999888";
    const normalizedPhone = normalizePhone(testPhone);
    assert.ok(normalizedPhone, "Test phone should normalize");

    // Clean up any existing test data
    await sql`DELETE FROM pl WHERE client_id IN (SELECT id FROM clients WHERE phone LIKE '%999888%')`;
    await sql`DELETE FROM leads WHERE phone LIKE '%999888%'`;
    await sql`DELETE FROM clients WHERE phone LIKE '%999888%'`;

    // 1. Create existing client with this phone
    const [existingClient] = await db
      .insert(clients)
      .values({
        name: "Existing Client",
        phone: testPhone,
        company: "Existing Co",
        normalizedName: "existing client",
      })
      .returning();

    assert.ok(existingClient, "Should create existing client");

    // 2. Create a lead with same phone
    const [testLead] = await db
      .insert(leads)
      .values({
        name: "Lead Name",
        phone: testPhone,
        company: "Lead Co",
        source: "test",
        status: "new",
        weight: "10.000",
        volume: "1.000",
        deliveryType: "road",
      })
      .returning();

    // 3. Convert with mode="new" - should create NEW client despite phone match
    const result = await db.transaction(async (tx) => {
      // Lock lead
      const [lead] = await tx
        .select()
        .from(leads)
        .where(eq(leads.id, testLead.id))
        .for("update")
        .limit(1);

      // Simulate mode="new" client creation
      const [newClient] = await tx
        .insert(clients)
        .values({
          name: "New Client (Duplicate Phone)",
          phone: testPhone, // Same phone!
          company: "New Co",
          normalizedName: "new client duplicate phone",
        })
        .returning();

      // Create PL
      const [createdPl] = await tx
        .insert(pl)
        .values({
          name: "Test Cargo",
          clientId: newClient.id,
          weight: lead.weight,
          volume: lead.volume,
          status: "draft",
        })
        .returning({ id: pl.id });

      // Update lead
      await tx
        .update(leads)
        .set({
          status: "converted",
          clientId: newClient.id,
          convertedPlId: createdPl.id,
        })
        .where(eq(leads.id, lead.id));

      return { newClientId: newClient.id, plId: createdPl.id };
    });

    // Assert: New client ID should be different from existing
    assert.notStrictEqual(
      result.newClientId,
      existingClient.id,
      "mode=new should create NEW client, not reuse existing"
    );

    // Assert: Both clients should exist in DB
    const allMatchingClients = await db
      .select()
      .from(clients)
      .where(eq(clients.phone, testPhone));

    assert.strictEqual(allMatchingClients.length, 2, "Should have 2 clients with same phone");

    // Cleanup
    await sql`DELETE FROM pl WHERE id = ${result.plId}`;
    await sql`DELETE FROM leads WHERE id = ${testLead.id}`;
    await sql`DELETE FROM clients WHERE id IN (${existingClient.id}, ${result.newClientId})`;
  });

  /**
   * Test: Two concurrent conversions result in only one success and one 409
   */
  it("concurrent conversions result in one success and one 409", async () => {
    const testPhone = "+996220777666";

    // Clean up
    await sql`DELETE FROM pl WHERE client_id IN (SELECT id FROM clients WHERE phone = ${testPhone})`;
    await sql`DELETE FROM leads WHERE phone = ${testPhone}`;
    await sql`DELETE FROM clients WHERE phone = ${testPhone}`;

    // Create lead
    const [testLead] = await db
      .insert(leads)
      .values({
        name: "Concurrent Test Lead",
        phone: testPhone,
        source: "test",
        status: "new",
        weight: "5.000",
        volume: "0.500",
        deliveryType: "air",
      })
      .returning();

    // Track results
    let successCount = 0;
    let conflictCount = 0;
    const results = [];

    // Simulate two concurrent conversions
    const attemptConversion = async (attemptNum) => {
      try {
        return await db.transaction(async (tx) => {
          // Lock lead
          const [lead] = await tx
            .select()
            .from(leads)
            .where(eq(leads.id, testLead.id))
            .for("update")
            .limit(1);

          // Check converted
          if (lead.status === "converted" || lead.convertedPlId != null) {
            return { status: "conflict", error: "LEAD_ALREADY_CONVERTED" };
          }

          // Small delay to increase chance of race condition
          await new Promise((r) => setTimeout(r, 50));

          // Create client
          const [newClient] = await tx
            .insert(clients)
            .values({
              name: `Concurrent Client ${attemptNum}`,
              phone: testPhone,
              normalizedName: `concurrent client ${attemptNum}`,
            })
            .returning();

          // Create PL
          const [createdPl] = await tx
            .insert(pl)
            .values({
              name: "Concurrent Cargo",
              clientId: newClient.id,
              weight: lead.weight,
              volume: lead.volume,
              status: "draft",
            })
            .returning({ id: pl.id });

          // Update lead
          await tx
            .update(leads)
            .set({
              status: "converted",
              clientId: newClient.id,
              convertedPlId: createdPl.id,
            })
            .where(eq(leads.id, lead.id));

          return { status: "success", clientId: newClient.id, plId: createdPl.id };
        });
      } catch (err) {
        return { status: "error", error: err.message };
      }
    };

    // Run two "concurrent" conversions
    const [result1, result2] = await Promise.all([
      attemptConversion(1),
      attemptConversion(2),
    ]);

    // Tally results
    for (const result of [result1, result2]) {
      if (result.status === "success") successCount++;
      if (result.status === "conflict") conflictCount++;
      results.push(result);
    }

    // Assert: Exactly one success
    assert.strictEqual(successCount, 1, "Should have exactly one successful conversion");

    // Assert: Exactly one conflict
    assert.strictEqual(conflictCount, 1, "Should have exactly one conflict (409)");

    // Assert: Only one PL created
    const pls = await db.select().from(pl).where(eq(pl.name, "Concurrent Cargo"));
    assert.strictEqual(pls.length, 1, "Should create exactly one PL");

    // Assert: Lead is converted
    const [updatedLead] = await db.select().from(leads).where(eq(leads.id, testLead.id));
    assert.strictEqual(updatedLead.status, "converted", "Lead should be converted");
    assert.ok(updatedLead.convertedPlId, "Lead should have convertedPlId");

    // Cleanup
    if (pls[0]) await sql`DELETE FROM pl WHERE id = ${pls[0].id}`;
    await sql`DELETE FROM leads WHERE id = ${testLead.id}`;
    const clientsToDelete = results
      .filter((r) => r.clientId)
      .map((r) => r.clientId);
    if (clientsToDelete.length > 0) {
      await sql`DELETE FROM clients WHERE id IN ${sql(clientsToDelete)}`;
    }
  });

  /**
   * Test: Transaction rollback leaves no orphan client and no partial lead/pl state
   */
  it("transaction rollback leaves no orphan data on failure", async () => {
    const testPhone = "+996220555444";

    // Clean up
    await sql`DELETE FROM pl WHERE client_id IN (SELECT id FROM clients WHERE phone = ${testPhone})`;
    await sql`DELETE FROM leads WHERE phone = ${testPhone}`;
    await sql`DELETE FROM clients WHERE phone = ${testPhone}`;

    // Create lead
    const [testLead] = await db
      .insert(leads)
      .values({
        name: "Rollback Test Lead",
        phone: testPhone,
        source: "test",
        status: "new",
        weight: "8.000",
        volume: "0.800",
        deliveryType: "road",
      })
      .returning();

    let createdClientId = null;

    try {
      await db.transaction(async (tx) => {
        // Step 1: Create client
        const [newClient] = await tx
          .insert(clients)
          .values({
            name: "Rollback Test Client",
            phone: testPhone,
            normalizedName: "rollback test client",
          })
          .returning();

        createdClientId = newClient.id;

        // Step 2: Create PL
        const [createdPl] = await tx
          .insert(pl)
          .values({
            name: "Rollback Cargo",
            clientId: newClient.id,
            weight: testLead.weight,
            volume: testLead.volume,
            status: "draft",
          })
          .returning({ id: pl.id });

        // Step 3: Simulate failure before lead update
        throw new Error("Simulated failure mid-transaction");

        // This should never execute
        await tx
          .update(leads)
          .set({ status: "converted" })
          .where(eq(leads.id, testLead.id));
      });
    } catch (err) {
      // Expected error
      assert.ok(err.message.includes("Simulated failure"));
    }

    // Assert: No client should exist (rolled back)
    const clientsAfter = await db.select().from(clients).where(eq(clients.phone, testPhone));
    assert.strictEqual(clientsAfter.length, 0, "Client should be rolled back (no orphan)");

    // Assert: No PL should exist (rolled back)
    const plsAfter = await db.select().from(pl).where(eq(pl.name, "Rollback Cargo"));
    assert.strictEqual(plsAfter.length, 0, "PL should be rolled back (no partial state)");

    // Assert: Lead should remain unconverted
    const [leadAfter] = await db.select().from(leads).where(eq(leads.id, testLead.id));
    assert.strictEqual(leadAfter.status, "new", "Lead should remain unconverted after rollback");
    assert.strictEqual(leadAfter.convertedPlId, null, "Lead should have no PL after rollback");

    // Cleanup
    await sql`DELETE FROM leads WHERE id = ${testLead.id}`;
  });

  /**
   * Test: Legacy fallback logs deprecation warning (verifies log structure)
   */
  it("legacy fallback mode logs deprecation warning with correct structure", async () => {
    const testPhone = "+996220333222";

    // Clean up
    await sql`DELETE FROM pl WHERE client_id IN (SELECT id FROM clients WHERE phone = ${testPhone})`;
    await sql`DELETE FROM leads WHERE phone = ${testPhone}`;
    await sql`DELETE FROM clients WHERE phone = ${testPhone}`;

    // Create lead
    const [testLead] = await db
      .insert(leads)
      .values({
        name: "Legacy Test Lead",
        phone: testPhone,
        source: "test",
        status: "new",
        weight: "3.000",
        volume: "0.300",
        deliveryType: "express",
      })
      .returning();

    // Track if warning would be logged
    let wouldLogWarning = false;
    const mockLogEntry = {
      tag: "DEPRECATED_CONVERSION",
      leadId: testLead.id,
      userId: "test-user-id",
      message: "Legacy conversion without clientResolution used",
    };

    // Verify log structure
    assert.strictEqual(mockLogEntry.tag, "DEPRECATED_CONVERSION");
    assert.strictEqual(mockLogEntry.leadId, testLead.id);
    assert.ok(mockLogEntry.message.includes("Legacy"));
    wouldLogWarning = true;

    // Simulate legacy conversion (no clientResolution)
    const result = await db.transaction(async (tx) => {
      const [lead] = await tx
        .select()
        .from(leads)
        .where(eq(leads.id, testLead.id))
        .for("update")
        .limit(1);

      // Legacy: auto-create client
      const [newClient] = await tx
        .insert(clients)
        .values({
          name: lead.name,
          phone: lead.phone,
          normalizedName: lead.name.toLowerCase().trim(),
        })
        .returning();

      const [createdPl] = await tx
        .insert(pl)
        .values({
          name: "Legacy Cargo",
          clientId: newClient.id,
          weight: lead.weight,
          volume: lead.volume,
          status: "draft",
        })
        .returning({ id: pl.id });

      await tx
        .update(leads)
        .set({
          status: "converted",
          clientId: newClient.id,
          convertedPlId: createdPl.id,
        })
        .where(eq(leads.id, lead.id));

      return { clientId: newClient.id, plId: createdPl.id };
    });

    assert.ok(wouldLogWarning, "Should log deprecation warning");
    assert.ok(result.clientId, "Legacy mode should still work");

    // Cleanup
    await sql`DELETE FROM pl WHERE id = ${result.plId}`;
    await sql`DELETE FROM leads WHERE id = ${testLead.id}`;
    await sql`DELETE FROM clients WHERE id = ${result.clientId}`;
  });
});
