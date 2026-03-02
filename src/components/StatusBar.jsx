// src/components/StatusBar.jsx
// Backend status indicator and metrics skeleton

import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function StatusBar() {
  const [status, setStatus] = useState({ loading: true, online: false });
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // Check health
    fetch(`${API_BASE}/api/health`)
      .then((r) => r.ok)
      .then((ok) => setStatus({ loading: false, online: ok }))
      .catch(() => setStatus({ loading: false, online: false }));

    // Load metrics skeleton
    fetch(`${API_BASE}/api/metrics/summary`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMetrics(data))
      .catch(() => setMetrics(null));
  }, []);

  const statusColor = status.loading ? "bg-yellow-400" : status.online ? "bg-green-500" : "bg-red-500";
  const statusText = status.loading ? "Checking..." : status.online ? "Online" : "Offline";

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
      {/* Status Indicator */}
      <div className="flex items-center gap-2 text-sm mb-2">
        <span className="text-gray-600">Backend:</span>
        <span className={`inline-block w-2 h-2 rounded-full ${statusColor}`} />
        <span className={status.online ? "text-green-600" : "text-red-600"}>
          {statusText}
        </span>
      </div>

      {/* Metrics Skeleton */}
      {metrics && (
        <div className="grid grid-cols-3 gap-4 text-xs">
          {/* Inbound */}
          <div className="bg-white p-2 rounded border">
            <div className="font-semibold text-gray-700 mb-1">Inbound (today)</div>
            <div className="text-gray-600">Leads: {metrics.inbound?.leads ?? 0}</div>
            <div className="text-gray-600">Orders: {metrics.inbound?.orders ?? 0}</div>
          </div>

          {/* Outbound */}
          <div className="bg-white p-2 rounded border">
            <div className="font-semibold text-gray-700 mb-1">Outbound (today)</div>
            <div className="text-gray-600">Calls: {metrics.outbound?.calls ?? 0}</div>
            <div className="text-gray-600">Offers: {metrics.outbound?.offers ?? 0}</div>
          </div>

          {/* Ads */}
          <div className="bg-white p-2 rounded border">
            <div className="font-semibold text-gray-700 mb-1">Ads (today)</div>
            <div className="text-gray-600">Spend: ${metrics.ads?.spend ?? 0}</div>
            <div className="text-gray-600">Clicks: {metrics.ads?.clicks ?? 0}</div>
          </div>
        </div>
      )}
    </div>
  );
}
