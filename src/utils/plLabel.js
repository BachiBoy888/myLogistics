// Utility for displaying PL user label
// Returns "PL-<label>" if label exists, "PL-" otherwise
export function getPLDisplayLabel(pl) {
  if (pl?.custom_pl_label) return `PL-${pl.custom_pl_label}`;
  return "PL-";
}

// Returns just the label text part for input fields (without PL- prefix)
export function getPLLabelInputValue(pl) {
  return pl?.custom_pl_label || "";
}
