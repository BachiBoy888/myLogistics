// src/utils/docs.js
// Единая точка импорта для старых компонентов:
//
// - типы документов берём из constants/docs
// - функции готовности/процентов ре-экспортим из utils/readiness

export { DOC_TYPES } from '../constants/docs.js';
export {
  percentForDoc,
  readinessForPL,
  canAllowToShip,
  requirementsResult,
} from './readiness.js';