-- Migration: Support additional documents with custom names
-- Changes unique constraint from (pl_id, doc_type) to (pl_id, doc_type, name)
-- This allows multiple "additional" type documents per PL with different names
-- Required documents (invoice, packing_list, etc.) have name=NULL and remain unique per PL

-- Drop old unique indexes
DROP INDEX IF EXISTS uq_pl_doc_type;
DROP INDEX IF EXISTS uq_pl_doc_unique_type_non_rejected;

-- Create new unique index that includes name
-- Required docs: name IS NULL → unique per type per PL
-- Additional docs: name IS NOT NULL → unique by (type, name) per PL
CREATE UNIQUE INDEX uq_pl_doc_type ON pl_documents (pl_id, doc_type, name);

-- Add index for querying additional docs by name
CREATE INDEX IF NOT EXISTS idx_pl_documents_name ON pl_documents (name) WHERE name IS NOT NULL;
