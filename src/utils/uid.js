// src/utils/uid.js
// Мини-утилита для генерации стабильных uid без внешних зависимостей

export function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).slice(2, 10);
}

export default uid;