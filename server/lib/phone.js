/**
 * Phone normalization utilities for Kyrgyzstan numbers
 * Canonical format: "996XXXXXXXXX" (12 digits, no plus)
 */

/**
 * Normalize a phone number to canonical format
 * @param {string|null|undefined} input - Raw phone input
 * @returns {string|null} - Normalized phone (996XXXXXXXXX) or null if invalid
 */
export function normalizePhone(input) {
  if (!input || typeof input !== "string") {
    return null;
  }

  // Remove all non-digit characters
  const digits = input.replace(/\D/g, "");

  // Rule 1: Length = 10 and starts with "0" → replace "0" with "996"
  if (digits.length === 10 && digits.startsWith("0")) {
    return "996" + digits.slice(1);
  }

  // Rule 2: Length = 9 → prepend "996"
  if (digits.length === 9) {
    return "996" + digits;
  }

  // Rule 3: Length = 12 and starts with "996" → keep as is
  if (digits.length === 12 && digits.startsWith("996")) {
    return digits;
  }

  // Invalid/unrecognized format
  return null;
}

/**
 * Generate possible raw phone variants from a normalized phone
 * Used for DB querying without full table scan
 * @param {string} normalizedPhone - Canonical format (996XXXXXXXXX)
 * @returns {string[]} - Array of possible raw formats
 */
export function generatePhoneVariants(normalizedPhone) {
  if (!normalizedPhone || normalizedPhone.length !== 12) {
    return [];
  }

  const variants = new Set();

  // Add canonical form
  variants.add(normalizedPhone);

  // Add with plus prefix
  variants.add("+" + normalizedPhone);

  // Local format (0XXXXXXXXX)
  variants.add("0" + normalizedPhone.slice(3));

  // Local format without leading 0 (XXXXXXXXX) - 9 digits
  variants.add(normalizedPhone.slice(3));

  return Array.from(variants);
}

/**
 * Build SQL WHERE clause for phone matching using variants
 * Returns a Drizzle SQL fragment for phone IN (variants)
 * @param {string|null} normalizedPhone
 * @returns {Object|null} - { phoneColumn, variants } or null
 */
export function buildPhoneMatchQuery(normalizedPhone) {
  if (!normalizedPhone) {
    return null;
  }

  const variants = generatePhoneVariants(normalizedPhone);
  return {
    variants,
    hasVariants: variants.length > 0,
  };
}
