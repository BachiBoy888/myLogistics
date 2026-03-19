import { describe, it } from "node:test";
import assert from "node:assert";
import { normalizePhone, generatePhoneVariants } from "./phone.js";

describe("Phone Normalization", () => {
  describe("normalizePhone", () => {
    it("should normalize 10-digit local format (0XXXXXXXXX)", () => {
      assert.strictEqual(normalizePhone("0220447446"), "996220447446");
    });

    it("should normalize format with + prefix", () => {
      assert.strictEqual(normalizePhone("+996220447446"), "996220447446");
    });

    it("should normalize 12-digit canonical format", () => {
      assert.strictEqual(normalizePhone("996220447446"), "996220447446");
    });

    it("should normalize 9-digit format without prefix", () => {
      assert.strictEqual(normalizePhone("220447446"), "996220447446");
    });

    it("should handle various separators and spaces", () => {
      assert.strictEqual(normalizePhone("+996 220 44 74 46"), "996220447446");
      assert.strictEqual(normalizePhone("0 (220) 447-446"), "996220447446");
      assert.strictEqual(normalizePhone("996-220-447-446"), "996220447446");
    });

    it("should return null for invalid input", () => {
      assert.strictEqual(normalizePhone("abc"), null);
      assert.strictEqual(normalizePhone(""), null);
      assert.strictEqual(normalizePhone(null), null);
      assert.strictEqual(normalizePhone(undefined), null);
    });

    it("should return null for unsupported formats", () => {
      // Too short
      assert.strictEqual(normalizePhone("12345"), null);
      // Wrong country code
      assert.strictEqual(normalizePhone("+123456789012"), null);
      // 11 digits (invalid)
      assert.strictEqual(normalizePhone("12345678901"), null);
      // 13 digits (invalid)
      assert.strictEqual(normalizePhone("9961234567890"), null);
    });

    it("should handle all KG format examples correctly", () => {
      const expected = "996220447446";
      assert.strictEqual(normalizePhone("0220447446"), expected);
      assert.strictEqual(normalizePhone("+996220447446"), expected);
      assert.strictEqual(normalizePhone("996220447446"), expected);
      assert.strictEqual(normalizePhone("220447446"), expected);
    });
  });

  describe("generatePhoneVariants", () => {
    it("should generate all variants from normalized phone", () => {
      const variants = generatePhoneVariants("996220447446");
      
      assert.ok(variants.includes("996220447446"));
      assert.ok(variants.includes("+996220447446"));
      assert.ok(variants.includes("0220447446"));
      assert.ok(variants.includes("220447446"));
    });

    it("should return empty array for invalid input", () => {
      assert.deepStrictEqual(generatePhoneVariants(null), []);
      assert.deepStrictEqual(generatePhoneVariants(""), []);
      assert.deepStrictEqual(generatePhoneVariants("123"), []);
      assert.deepStrictEqual(generatePhoneVariants("99612345"), []); // too short
    });

    it("should return unique variants only", () => {
      const variants = generatePhoneVariants("996220447446");
      const uniqueVariants = [...new Set(variants)];
      assert.strictEqual(variants.length, uniqueVariants.length);
    });
  });
});
