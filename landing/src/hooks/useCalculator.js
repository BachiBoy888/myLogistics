import { useState, useCallback, useRef, useEffect } from "react";
import { calculateShippingEstimate as apiCalculate } from "../utils/api.js";
import { calculateVolume, debounce } from "../utils/helpers.js";
import { trackCalculator } from "../utils/analytics.js";

const CALCULATION_DEBOUNCE = 800; // ms

/**
 * Hook for calculator state and backend integration
 * Backend is the single source of truth for pricing
 */
export function useCalculator() {
  // Form inputs
  const [inputs, setInputs] = useState({
    weight: "",
    length: "",
    width: "",
    height: "",
    originCity: "guangzhou",
    deliveryType: "economy",
  });
  
  // Calculation state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Track if user has interacted
  const hasInteracted = useRef(false);
  
  // Calculate volume from dimensions
  const volume = calculateVolume(
    inputs.length,
    inputs.width,
    inputs.height
  );
  
  // Check if form has enough data for calculation
  const canCalculate = 
    Number(inputs.weight) > 0 && volume > 0;
  
  // Update input handler
  const updateInput = useCallback((field, value) => {
    hasInteracted.current = true;
    setInputs((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }, []);
  
  // Perform calculation via backend
  const performCalculation = useCallback(async () => {
    if (!canCalculate) {
      setResult(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCalculate({
        weight: inputs.weight,
        volume: volume,
        originCity: inputs.originCity === "other" ? null : inputs.originCity,
        deliveryType: inputs.deliveryType === "economy" ? "road" : 
                     inputs.deliveryType === "standard" ? "road" : "express",
      });
      
      setResult(response);
      trackCalculator({
        weight: inputs.weight,
        volume: volume,
        deliveryType: inputs.deliveryType,
        originCity: inputs.originCity,
      });
    } catch (err) {
      console.error("Calculation error:", err);
      setError(err.message || "Не удалось рассчитать стоимость");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [inputs, volume, canCalculate]);
  
  // Debounced calculation
  const debouncedCalculate = useRef(
    debounce(performCalculation, CALCULATION_DEBOUNCE)
  ).current;
  
  // Trigger calculation when inputs change (if user has interacted)
  useEffect(() => {
    if (hasInteracted.current && canCalculate) {
      debouncedCalculate();
    }
  }, [inputs.weight, inputs.length, inputs.width, inputs.height, 
      inputs.originCity, inputs.deliveryType, canCalculate, debouncedCalculate]);
  
  // Manual calculate button handler
  const calculate = useCallback(() => {
    hasInteracted.current = true;
    performCalculation();
  }, [performCalculation]);
  
  // Reset calculator
  const reset = useCallback(() => {
    setInputs({
      weight: "",
      length: "",
      width: "",
      height: "",
      originCity: "guangzhou",
      deliveryType: "economy",
    });
    setResult(null);
    setError(null);
    hasInteracted.current = false;
  }, []);
  
  return {
    inputs,
    volume,
    result,
    loading,
    error,
    canCalculate,
    updateInput,
    calculate,
    reset,
  };
}

export default useCalculator;
