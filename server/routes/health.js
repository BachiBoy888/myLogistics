// server/routes/health.js
// Healthcheck and metrics endpoints - no auth required

export default async function healthRoutes(app) {
  /**
   * GET /api/health
   * Basic healthcheck - always returns 200 if server is up
   */
  app.get("/health", async (req, reply) => {
    return {
      ok: true,
      service: "myLogistics",
      env: process.env.NODE_ENV || "development",
      time: new Date().toISOString(),
    };
  });

  /**
   * GET /api/metrics/summary
   * Skeleton metrics - returns zeros for now
   * Structure stable for future expansion
   */
  app.get("/metrics/summary", async (req, reply) => {
    const period = req.query.period || "today";
    
    return {
      period: period,
      timestamp: new Date().toISOString(),
      inbound: {
        leads: 0,
        orders: 0,
        requests: 0,
      },
      outbound: {
        calls: 0,
        offers: 0,
        conversions: 0,
      },
      ads: {
        spend: 0,
        clicks: 0,
        leads: 0,
        cpc: 0,
      },
      // North Star metrics placeholders
      profit: {
        perOrder: 0,
        total: 0,
      },
      effort: {
        perOrder: 0,
        corrections: 0,
        manualInterventions: 0,
      },
    };
  });
}
