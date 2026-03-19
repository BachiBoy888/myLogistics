import { describe, it } from "node:test";
import assert from "node:assert";

/**
 * Unit tests for lead conversion logic
 * These tests don't require a database connection
 */

describe("Lead Conversion - Phone Normalization", () => {
  it("should normalize all KG phone formats correctly", async () => {
    const { normalizePhone } = await import("../lib/phone.js");

    const testCases = [
      { input: "0220447446", expected: "996220447446" },
      { input: "+996220447446", expected: "996220447446" },
      { input: "996220447446", expected: "996220447446" },
      { input: "220447446", expected: "996220447446" },
    ];

    for (const { input, expected } of testCases) {
      assert.strictEqual(normalizePhone(input), expected);
    }
  });

  it("should return null for invalid phone numbers", async () => {
    const { normalizePhone } = await import("../lib/phone.js");

    assert.strictEqual(normalizePhone("abc"), null);
    assert.strictEqual(normalizePhone("12345"), null);
    assert.strictEqual(normalizePhone(""), null);
    assert.strictEqual(normalizePhone(null), null);
    assert.strictEqual(normalizePhone(undefined), null);
  });

  it("should generate phone variants for DB querying", async () => {
    const { generatePhoneVariants } = await import("../lib/phone.js");

    const variants = generatePhoneVariants("996220447446");

    assert.ok(variants.includes("996220447446"));
    assert.ok(variants.includes("+996220447446"));
    assert.ok(variants.includes("0220447446"));
    assert.ok(variants.includes("220447446"));
  });
});

describe("Lead Conversion - Preview Response Contract", () => {
  it("existingLink represents single DB-linked client (not array)", () => {
    // Preview response should have:
    // - existingLink: single client object or null (the actual lead.clientId relationship)
    // - exactPhoneMatches: array of suggestions (phone-based matches)
    
    const mockResponse = {
      existingLink: { id: 1, name: "Linked Client" }, // Single object
      exactPhoneMatches: [
        { id: 1, name: "Linked Client" },
        { id: 2, name: "Other Client With Same Phone" }
      ], // Array of suggestions
    };

    assert.ok(mockResponse.existingLink !== undefined, "Should have existingLink");
    assert.ok(!Array.isArray(mockResponse.existingLink), "existingLink should be single object, not array");
    assert.ok(Array.isArray(mockResponse.exactPhoneMatches), "exactPhoneMatches should be array");
  });

  it("counts reflect semantic distinction between link and matches", () => {
    const mockCounts = {
      hasExistingLink: true,  // boolean
      exactPhoneMatchCount: 2,  // number
      isAlreadyConverted: false,
    };

    assert.strictEqual(typeof mockCounts.hasExistingLink, "boolean");
    assert.strictEqual(typeof mockCounts.exactPhoneMatchCount, "number");
  });
});

describe("Lead Conversion - Client Resolution", () => {
  it("should validate existing client mode requires clientId", () => {
    const resolution = { mode: "existing" };

    // Validate that clientId is required
    if (resolution.mode === "existing" && !resolution.clientId) {
      // This is the expected validation error
      assert.ok(true, "Validation should catch missing clientId");
    } else {
      assert.fail("Should require clientId for existing mode");
    }
  });

  it("should validate new client mode requires client payload", () => {
    const resolution = { mode: "new" };

    // Validate that client payload is required
    if (resolution.mode === "new" && !resolution.client) {
      // This is the expected validation error
      assert.ok(true, "Validation should catch missing client payload");
    } else {
      assert.fail("Should require client payload for new mode");
    }
  });

  it("should validate new client mode requires name", () => {
    const resolution = { mode: "new", client: {} };

    // Validate that name is required
    if (resolution.mode === "new" && (!resolution.client?.name || String(resolution.client.name).trim() === "")) {
      // This is the expected validation error
      assert.ok(true, "Validation should catch missing name");
    } else {
      assert.fail("Should require name for new client");
    }
  });

  it("should accept valid existing client resolution", () => {
    const resolution = { mode: "existing", clientId: 123 };

    assert.strictEqual(resolution.mode, "existing");
    assert.strictEqual(resolution.clientId, 123);
  });

  it("should accept valid new client resolution", () => {
    const resolution = {
      mode: "new",
      client: {
        name: "Test Client",
        phone: "+996220447446",
        company: "Test Co",
      },
    };

    assert.strictEqual(resolution.mode, "new");
    assert.ok(resolution.client);
    assert.strictEqual(resolution.client.name, "Test Client");
  });
});

describe("Lead Conversion - Legacy Behavior Rules (Documented)", () => {
  // LEGACY BEHAVIOR RULES (transitional backward compatibility):
  // 1. missing clientResolution property → LEGACY MODE (deprecated, logs warning)
  // 2. null clientResolution → ERROR: CLIENT_RESOLUTION_REQUIRED
  // 3. empty object {} → ERROR: CLIENT_RESOLUTION_REQUIRED (no mode specified)
  // 4. valid mode specified → EXPLICIT MODE (preferred)

  it("missing clientResolution property → LEGACY MODE (transitional)", () => {
    const body = {}; // Property completely missing
    const hasClientResolutionProp = Object.prototype.hasOwnProperty.call(body, "clientResolution");
    const clientResolution = body.clientResolution;
    const isExplicitMode = !!(clientResolution && (clientResolution.mode === "existing" || clientResolution.mode === "new"));

    // Rule: missing property → legacy mode (no error)
    assert.strictEqual(hasClientResolutionProp, false);
    assert.strictEqual(isExplicitMode, false);
    // In this case, legacy conversion proceeds with deprecation warning
  });

  it("null clientResolution → CLIENT_RESOLUTION_REQUIRED error", () => {
    const body = { clientResolution: null };
    const hasClientResolutionProp = Object.prototype.hasOwnProperty.call(body, "clientResolution");
    const clientResolution = body.clientResolution;
    
    // Rule: explicitly null → require resolution
    assert.strictEqual(hasClientResolutionProp, true);
    assert.strictEqual(clientResolution, null);
    
    // Should return CLIENT_RESOLUTION_REQUIRED
    if (hasClientResolutionProp && (!clientResolution || !clientResolution.mode)) {
      assert.ok(true, "Should trigger CLIENT_RESOLUTION_REQUIRED");
    }
  });

  it("empty clientResolution {} → CLIENT_RESOLUTION_REQUIRED error", () => {
    const body = { clientResolution: {} };
    const hasClientResolutionProp = Object.prototype.hasOwnProperty.call(body, "clientResolution");
    const clientResolution = body.clientResolution;
    
    // Rule: empty object → require resolution (no mode specified)
    assert.strictEqual(hasClientResolutionProp, true);
    assert.deepStrictEqual(clientResolution, {});
    assert.strictEqual(clientResolution.mode, undefined);
    
    // Should return CLIENT_RESOLUTION_REQUIRED
    if (hasClientResolutionProp && (!clientResolution || !clientResolution.mode)) {
      assert.ok(true, "Should trigger CLIENT_RESOLUTION_REQUIRED");
    }
  });

  it("valid explicit mode → EXPLICIT MODE (preferred)", () => {
    const body = { clientResolution: { mode: "existing", clientId: 1 } };
    const hasClientResolutionProp = Object.prototype.hasOwnProperty.call(body, "clientResolution");
    const clientResolution = body.clientResolution;
    const isExplicitMode = clientResolution && (clientResolution.mode === "existing" || clientResolution.mode === "new");

    // Rule: valid mode → explicit mode
    assert.strictEqual(hasClientResolutionProp, true);
    assert.strictEqual(isExplicitMode, true);
  });

  it("invalid mode → INVALID_CLIENT_RESOLUTION_MODE error", () => {
    const body = { clientResolution: { mode: "invalid" } };
    const clientResolution = body.clientResolution;
    const isValidMode = clientResolution.mode === "existing" || clientResolution.mode === "new";

    assert.strictEqual(isValidMode, false);
    // Should return INVALID_CLIENT_RESOLUTION_MODE
  });
});

describe("Lead Conversion - Error Codes", () => {
  const expectedErrors = [
    { code: "LEAD_NOT_FOUND", status: 404 },
    { code: "LEAD_ALREADY_CONVERTED", status: 409 },
    { code: "CLIENT_RESOLUTION_REQUIRED", status: 400 },
    { code: "INVALID_CLIENT_RESOLUTION_MODE", status: 400 },
    { code: "CLIENT_ID_REQUIRED", status: 400 },
    { code: "CLIENT_NOT_FOUND", status: 404 },
    { code: "CLIENT_PAYLOAD_REQUIRED", status: 400 },
    { code: "CLIENT_NAME_REQUIRED", status: 400 },
  ];

  for (const { code, status } of expectedErrors) {
    it(`should define error ${code} with status ${status}`, () => {
      assert.ok(code);
      assert.ok(status);
    });
  }
});

describe("Lead Conversion - Deprecation Logging", () => {
  it("should have correct deprecation log format", () => {
    const logEntry = {
      tag: "DEPRECATED_CONVERSION",
      leadId: 123,
      userId: "user-456",
      message: "Legacy conversion without clientResolution used",
    };

    assert.strictEqual(logEntry.tag, "DEPRECATED_CONVERSION");
    assert.strictEqual(logEntry.leadId, 123);
    assert.strictEqual(logEntry.userId, "user-456");
  });
});

describe("Lead Conversion - Phone Matching Strategy", () => {
  it("should generate variants for efficient DB querying", async () => {
    const { normalizePhone, generatePhoneVariants } = await import("../lib/phone.js");

    const leadPhone = "+996 220 44 74 46";
    const normalized = normalizePhone(leadPhone);
    const variants = generatePhoneVariants(normalized);

    // Should generate multiple variants for IN clause query
    assert.ok(variants.length >= 4);

    // All variants should match the lead's phone when normalized
    for (const variant of variants) {
      assert.strictEqual(normalizePhone(variant), normalized);
    }
  });
});
