// src/utils/dateDeadline.js
// Helpers for deadline indicator calculations

/**
 * Calculate days between two dates (calendar days, not hours)
 * @param {Date} targetDate - target date
 * @param {Date} fromDate - from date (defaults to today)
 * @returns {number} - positive = future, negative = past, 0 = same day
 */
export function getDaysDiff(targetDate, fromDate = new Date()) {
  // Normalize both dates to midnight local time to avoid timezone drift
  const normalizeToLocalDay = (d) => {
    const date = new Date(d);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const target = normalizeToLocalDay(targetDate);
  const from = normalizeToLocalDay(fromDate);

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = target.getTime() - from.getTime();
  return Math.round(diffMs / msPerDay);
}

/**
 * Get deadline indicator info for a consolidation
 * @param {Object} cons - consolidation object
 * @param {string} cons.status - consolidation status
 * @param {string} cons.plannedArrivalDate - planned arrival date (YYYY-MM-DD)
 * @param {string} cons.planned_arrival_date - alternative field name
 * @returns {Object|null} - indicator info or null if no indicator should show
 *   - days: number of days (positive = future, negative = past)
 *   - variant: 'future' | 'today' | 'overdue'
 *   - label: human readable label
 *   - colorClass: CSS class for coloring
 */
export function getDeadlineIndicator(cons) {
  if (!cons) return null;

  // Don't show indicator for closed consolidations
  if (cons.status === "closed") {
    return null;
  }

  const plannedDate = cons.plannedArrivalDate || cons.planned_arrival_date;
  if (!plannedDate) return null;

  const days = getDaysDiff(plannedDate);

  if (days > 0) {
    // Future date
    const label = days === 1 ? "Остался 1 день" : `Осталось ${days} дня`;
    return {
      days,
      variant: "future",
      label,
      colorClass: "text-green-600 bg-green-50",
      badgeClass: "bg-green-100 text-green-700",
    };
  } else if (days < 0) {
    // Past date (overdue)
    const overdueDays = Math.abs(days);
    const label = overdueDays === 1 ? "Просрочка 1 день" : `Просрочка ${overdueDays} дня`;
    return {
      days: overdueDays,
      variant: "overdue",
      label,
      colorClass: "text-red-600 bg-red-50",
      badgeClass: "bg-red-100 text-red-700",
    };
  } else {
    // Today
    return {
      days: 0,
      variant: "today",
      label: "Сегодня",
      colorClass: "text-amber-600 bg-amber-50",
      badgeClass: "bg-amber-100 text-amber-700",
    };
  }
}

/**
 * Format date for display (Russian locale)
 * @param {string|Date} date - date to format
 * @returns {string} - formatted date like "25.03.2026"
 */
export function formatDateRu(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
