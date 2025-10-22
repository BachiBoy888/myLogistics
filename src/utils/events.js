// src/utils/events.js
export function safeEvents(input, { plId = null, logger } = {}) {
  const arr = Array.isArray(input) ? input : [];
  const sanitized = arr
    .map((ev, idx) => {
      if (!ev || typeof ev !== "object") return null;
      const type = ev.type ?? "event";
      const createdAt =
        ev.createdAt ??
        ev.created_at ??
        ev.at ??
        new Date().toISOString();
      const baseId = ev.id ?? ev._id ?? `${type}-${plId ?? "pl"}-${idx}`;
      const meta =
        ev.meta && typeof ev.meta === "object" ? ev.meta : {};
      return {
        ...ev,
        id: String(baseId),
        type,
        title: ev.title ?? ev.message ?? type,
        details: ev.details ?? ev.message ?? "",
        message: ev.message ?? ev.details ?? "",
        user: ev.user ?? ev.author ?? null,
        createdAt,
        meta,
      };
    })
    .filter(Boolean);

  if (logger && typeof logger === "function") {
    logger({
      plId,
      received: arr.length,
      sanitized: sanitized.length,
      dropped: arr.length - sanitized.length,
    });
  }

  return sanitized;
}
