-- Разрешаем несколько rejected, но запрещаем >1 для pending/approved
DROP INDEX IF EXISTS uq_pl_doc_unique_type_non_rejected;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pl_doc_unique_type_non_rejected
ON pl_documents (pl_id, doc_type)
WHERE status IN ('pending', 'approved');