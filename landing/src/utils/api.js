// API client for landing page
// Isolated from CRM API client — uses public endpoints only

const API_BASE = import.meta.env.VITE_API_URL || "/api";

/**
 * Calculate shipping estimate via backend
 * Backend is the single source of truth for pricing
 */
export async function calculateShippingEstimate({
  weight,
  volume,
  originCity,
  deliveryType = "road",
}) {
  const response = await fetch(`${API_BASE}/public/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      weight: Number(weight),
      volume: Number(volume),
      originCity,
      deliveryType,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to calculate estimate");
  }

  return response.json();
}

/**
 * Submit lead from calculator or contact form
 */
export async function submitLead({
  name,
  phone,
  company,
  email,
  comment,
  // Calculator context
  weight,
  volume,
  originCity,
  deliveryType,
  estimatedPrice,
  estimatedCurrency,
  estimatedDaysMin,
  estimatedDaysMax,
  // Attribution
  source = "website_calculator",
  utmSource,
  utmMedium,
  utmCampaign,
  utmContent,
}) {
  const payload = {
    name: name.trim(),
    phone: phone.trim(),
    company: company?.trim() || null,
    email: email?.trim() || null,
    note: comment?.trim() || null,
    weight: Number(weight),
    volume: Number(volume),
    originCity: originCity || null,
    deliveryType,
    estimatedPrice: estimatedPrice != null ? Number(estimatedPrice) : null,
    estimatedCurrency: estimatedCurrency || "USD",
    estimatedDaysMin: estimatedDaysMin || 0,
    estimatedDaysMax: estimatedDaysMax || 0,
    source,
  };

  const response = await fetch(`${API_BASE}/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to submit lead");
  }

  return response.json();
}

export default {
  calculateShippingEstimate,
  submitLead,
};
