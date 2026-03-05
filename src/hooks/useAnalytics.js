// src/hooks/useAnalytics.js
// Хук для получения аналитических данных из БД

import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";

export function useAnalytics(dateRange, granularity) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          from: dateRange.from,
          to: dateRange.to,
          granularity,
        });

        const response = await fetch(`${API_BASE}/api/analytics?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Analytics fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dateRange.from, dateRange.to, granularity]);

  return { data, loading, error };
}
