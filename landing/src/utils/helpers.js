// Utility functions for landing page

/**
 * Format phone number for display
 */
export function formatPhone(phone) {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("996")) {
    return `+996 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
  }
  return phone;
}

/**
 * Generate WhatsApp link with pre-filled message
 */
export function getWhatsAppLink(phone, message) {
  const formattedPhone = phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message || "");
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Generate Telegram link
 */
export function getTelegramLink(username) {
  return `https://t.me/${username.replace("@", "")}`;
}

/**
 * Calculate volume weight
 * This is for display purposes only — backend calculates billable weight
 */
export function calculateVolumeWeight(length, width, height) {
  const l = Number(length) || 0;
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  return (l * w * h) / 6000; // kg
}

/**
 * Calculate volume in cubic meters
 */
export function calculateVolume(length, width, height) {
  const l = Number(length) || 0;
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  return (l * w * h) / 1000000; // m³
}

/**
 * Format price with currency
 */
export function formatPrice(price, currency = "USD") {
  if (price == null || isNaN(price)) return "—";
  const symbol = currency === "USD" ? "$" : currency;
  return `${symbol}${Number(price).toFixed(2)}`;
}

/**
 * Format weight
 */
export function formatWeight(weight) {
  if (weight == null || isNaN(weight)) return "—";
  return `${Number(weight).toFixed(2)} кг`;
}

/**
 * Format dimensions
 */
export function formatDimensions(length, width, height) {
  const l = Number(length) || 0;
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (!l && !w && !h) return "—";
  return `${l}×${w}×${h} см`;
}

/**
 * Get URL parameters (for UTM tracking)
 */
export function getUrlParams() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    utmTerm: params.get("utm_term"),
  };
}

/**
 * Generate calculator result message for WhatsApp/Telegram
 */
export function generateCalculatorMessage({
  weight,
  volume,
  originCity,
  deliveryType,
  estimatedPrice,
  estimatedDaysMin,
  estimatedDaysMax,
}) {
  const cityLabel = originCity || "Китай";
  const typeLabels = {
    economy: "Эконом (авто)",
    standard: "Стандарт (авто)",
    express: "Экспресс (авиа)",
  };
  
  return `Здравствуйте! Хочу уточнить детали доставки.

Параметры:
• Вес: ${weight} кг
• Объем: ${volume} м³
• Откуда: ${cityLabel}
• Способ: ${typeLabels[deliveryType] || deliveryType}
• Расчетная стоимость: $${estimatedPrice}
• Срок: ${estimatedDaysMin}-${estimatedDaysMax} дней

Пожалуйста, свяжитесь со мной для уточнения деталей.`;
}

/**
 * Validate phone number (basic validation)
 */
export function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 9;
}

/**
 * Debounce function
 */
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export default {
  formatPhone,
  getWhatsAppLink,
  getTelegramLink,
  calculateVolumeWeight,
  calculateVolume,
  formatPrice,
  formatWeight,
  formatDimensions,
  getUrlParams,
  generateCalculatorMessage,
  isValidPhone,
  debounce,
};
