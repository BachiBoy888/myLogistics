// Analytics utility — structured for future GA4/Meta Pixel integration
// Currently logs events to console in dev mode

const isDev = import.meta.env.DEV;

export const EVENTS = {
  // Calculator events
  CALCULATOR_OPEN: "calculator_open",
  CALCULATOR_CALCULATE: "calculator_calculate",
  CALCULATOR_RESULT_VIEW: "calculator_result_view",
  CALCULATOR_RETRY: "calculator_retry",
  
  // Lead events
  LEAD_FORM_OPEN: "lead_form_open",
  LEAD_FORM_SUBMIT: "lead_form_submit",
  LEAD_FORM_SUCCESS: "lead_form_success",
  LEAD_FORM_ERROR: "lead_form_error",
  
  // Contact events
  WHATSAPP_CLICK: "whatsapp_click",
  TELEGRAM_CLICK: "telegram_click",
  PHONE_CLICK: "phone_click",
  EMAIL_CLICK: "email_click",
  
  // Page events
  PAGE_VIEW: "page_view",
  SCROLL_DEPTH: "scroll_depth",
  
  // CTA events
  CTA_CLICK: "cta_click",
  NAVIGATION_CLICK: "navigation_click",
};

/**
 * Track an analytics event
 * Currently logs to console; ready for GA4/Meta Pixel integration
 */
export function trackEvent(eventName, params = {}) {
  // Add timestamp and URL
  const eventData = {
    event: eventName,
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : "",
    ...params,
  };
  
  // Log in development
  if (isDev) {
    console.log("[Analytics]", eventData);
  }
  
  // Google Analytics 4 (when configured)
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
  
  // Meta Pixel (when configured)
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", eventName, params);
  }
  
  // Custom endpoint (optional)
  // sendToCustomEndpoint(eventData);
}

/**
 * Track page view
 */
export function trackPageView(pageName, additionalParams = {}) {
  trackEvent(EVENTS.PAGE_VIEW, {
    page_name: pageName,
    page_title: typeof document !== "undefined" ? document.title : "",
    ...additionalParams,
  });
}

/**
 * Track calculator usage
 */
export function trackCalculator(calculationData) {
  trackEvent(EVENTS.CALCULATOR_CALCULATE, {
    weight: calculationData.weight,
    volume: calculationData.volume,
    delivery_type: calculationData.deliveryType,
    origin_city: calculationData.originCity,
  });
}

/**
 * Track lead submission
 */
export function trackLeadSubmit(success, leadData = {}) {
  const event = success ? EVENTS.LEAD_FORM_SUCCESS : EVENTS.LEAD_FORM_ERROR;
  trackEvent(event, {
    source: leadData.source,
    has_calculator_context: !!leadData.estimatedPrice,
    delivery_type: leadData.deliveryType,
  });
}

/**
 * Track contact click
 */
export function trackContactClick(type, context = "") {
  const eventMap = {
    whatsapp: EVENTS.WHATSAPP_CLICK,
    telegram: EVENTS.TELEGRAM_CLICK,
    phone: EVENTS.PHONE_CLICK,
    email: EVENTS.EMAIL_CLICK,
  };
  
  trackEvent(eventMap[type] || EVENTS.CTA_CLICK, {
    contact_type: type,
    context,
  });
}

export default {
  EVENTS,
  trackEvent,
  trackPageView,
  trackCalculator,
  trackLeadSubmit,
  trackContactClick,
};
