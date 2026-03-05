// src/hooks/useAnalytics.js
// Хук для получения аналитических данных из БД

import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";

export function useAnalytics(dateRange, granularity) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
        granularity,
      });

      const url = `${API_BASE}/api/analytics?${params}`;
      console.log("Fetching analytics:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("Analytics data received:", result);
      setData(result);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange?.from, dateRange?.to, granularity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
