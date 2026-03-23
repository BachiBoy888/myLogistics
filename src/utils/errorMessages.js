// src/utils/errorMessages.js
// Human-readable error messages for CRM operations

const ERROR_MESSAGES = {
  // Document operations
  UPLOAD_DOC: {
    default: "Не удалось загрузить документ. Пожалуйста, попробуйте еще раз.",
    network: "Не удалось загрузить документ. Проверьте подключение к интернету.",
    server: "Не удалось загрузить документ. Сервер временно недоступен.",
    tooLarge: "Файл слишком большой. Максимальный размер — 50 МБ.",
  },
  DELETE_DOC: {
    default: "Не удалось удалить документ. Пожалуйста, попробуйте еще раз.",
  },
  UPDATE_DOC: {
    default: "Не удалось обновить статус документа. Пожалуйста, попробуйте еще раз.",
  },
  LOAD_DOCS: {
    default: "Не удалось загрузить список документов. Пожалуйста, обновите страницу.",
  },
  
  // Client operations
  SAVE_CLIENT: {
    default: "Не удалось сохранить клиента. Пожалуйста, проверьте данные и попробуйте еще раз.",
  },
  LOAD_CLIENTS: {
    default: "Не удалось загрузить список клиентов. Пожалуйста, обновите страницу.",
  },
  
  // PL operations
  SAVE_PL: {
    default: "Не удалось сохранить карточку груза. Пожалуйста, проверьте данные и попробуйте еще раз.",
  },
  LOAD_PL: {
    default: "Не удалось загрузить данные груза. Пожалуйста, обновите страницу.",
  },
  DELETE_PL: {
    default: "Не удалось удалить карточку груза. Пожалуйста, попробуйте еще раз.",
  },
  
  // Comments
  ADD_COMMENT: {
    default: "Не удалось добавить комментарий. Пожалуйста, попробуйте еще раз.",
  },
  DELETE_COMMENT: {
    default: "Не удалось удалить комментарий. Пожалуйста, попробуйте еще раз.",
  },
  
  // Consolidations
  SAVE_CONS: {
    default: "Не удалось сохранить консолидацию. Пожалуйста, проверьте данные и попробуйте еще раз.",
  },
  
  // Generic fallback
  GENERIC: {
    default: "Что-то пошло не так. Пожалуйста, попробуйте еще раз.",
    network: "Проблема с подключением. Проверьте интернет и попробуйте снова.",
    server: "Сервер временно недоступен. Пожалуйста, попробуйте позже.",
  },
};

/**
 * Get human-readable error message for an operation
 * @param {string} operation - Operation key from ERROR_MESSAGES
 * @param {Error|null} error - Error object (optional)
 * @returns {string} Human-readable message in Russian
 */
export function getErrorMessage(operation, error = null) {
  const messages = ERROR_MESSAGES[operation] || ERROR_MESSAGES.GENERIC;
  
  // Determine error type from error object
  if (error) {
    // Network errors (fetch failed, no connection)
    if (error.name === 'TypeError' || error.message?.includes('fetch') || error.message?.includes('network')) {
      return messages.network || messages.default;
    }
    
    // HTTP status based classification
    const status = error.statusCode || error.status;
    if (status >= 500) {
      return messages.server || messages.default;
    }
    if (status === 413) {
      return messages.tooLarge || messages.default;
    }
  }
  
  return messages.default || ERROR_MESSAGES.GENERIC.default;
}

/**
 * Simple wrapper to format any error for display
 * Removes technical details, returns clean Russian message
 * @param {string} context - What user was trying to do
 * @param {Error|null} error - Original error
 * @returns {string} Clean error message
 */
export function formatUserError(context, error = null) {
  // Map context to operation key
  const contextMap = {
    'загрузка документа': 'UPLOAD_DOC',
    'удаление документа': 'DELETE_DOC',
    'обновление документа': 'UPDATE_DOC',
    'загрузка списка документов': 'LOAD_DOCS',
    'сохранение клиента': 'SAVE_CLIENT',
    'сохранение груза': 'SAVE_PL',
    'загрузка груза': 'LOAD_PL',
    'удаление груза': 'DELETE_PL',
    'добавление комментария': 'ADD_COMMENT',
    'удаление комментария': 'DELETE_COMMENT',
    'сохранение консолидации': 'SAVE_CONS',
  };
  
  const operation = contextMap[context?.toLowerCase()];
  if (operation) {
    return getErrorMessage(operation, error);
  }
  
  // Fallback: generic message without technical details
  return context 
    ? `Не удалось выполнить операцию "${context}". Пожалуйста, попробуйте еще раз.`
    : ERROR_MESSAGES.GENERIC.default;
}

export default ERROR_MESSAGES;
