import { useState, useCallback } from "react";
import { submitLead as apiSubmitLead } from "../utils/api.js";
import { getUrlParams, isValidPhone } from "../utils/helpers.js";
import { trackLeadSubmit } from "../utils/analytics.js";

/**
 * Hook for lead submission from calculator or contact form
 */
export function useLeadSubmit(calculatorContext = null) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    company: "",
    email: "",
    comment: "",
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Update form field
  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  }, [error]);
  
  // Validate form
  const validate = useCallback(() => {
    if (!formData.name.trim()) {
      return "Пожалуйста, введите ваше имя";
    }
    if (!isValidPhone(formData.phone)) {
      return "Пожалуйста, введите корректный номер телефона";
    }
    return null;
  }, [formData]);
  
  // Submit lead
  const submit = useCallback(async (source = "website_calculator") => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return false;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Get UTM params for attribution
      const utmParams = getUrlParams();
      
      // Build payload
      const payload = {
        name: formData.name,
        phone: formData.phone,
        company: formData.company || null,
        email: formData.email || null,
        comment: formData.comment || null,
        source,
        ...utmParams,
      };
      
      // Add calculator context if available
      if (calculatorContext) {
        Object.assign(payload, {
          weight: calculatorContext.weight,
          volume: calculatorContext.volume,
          originCity: calculatorContext.originCity,
          deliveryType: calculatorContext.deliveryType,
          estimatedPrice: calculatorContext.estimatedPrice,
          estimatedCurrency: calculatorContext.estimatedCurrency,
          estimatedDaysMin: calculatorContext.estimatedDaysMin,
          estimatedDaysMax: calculatorContext.estimatedDaysMax,
        });
      }
      
      await apiSubmitLead(payload);
      
      setSuccess(true);
      trackLeadSubmit(true, { source, ...calculatorContext });
      return true;
    } catch (err) {
      console.error("Lead submission error:", err);
      setError(err.message || "Не удалось отправить заявку. Попробуйте позже.");
      trackLeadSubmit(false, { source });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [formData, validate, calculatorContext]);
  
  // Reset form
  const reset = useCallback(() => {
    setFormData({
      name: "",
      phone: "",
      company: "",
      email: "",
      comment: "",
    });
    setSuccess(false);
    setError(null);
  }, []);
  
  return {
    formData,
    updateField,
    submitting,
    success,
    error,
    submit,
    reset,
  };
}

export default useLeadSubmit;
