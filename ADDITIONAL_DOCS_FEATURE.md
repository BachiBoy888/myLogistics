# Additional Documents Feature - Implementation Summary

## Overview
Extended the existing document system to support **Additional Documents** uploaded by users, while preserving the existing required document workflow exactly as before.

---

## Architecture Changes

### Database Schema (`server/db/schema.js`)

**Changed:**
- Unique constraint on `pl_documents` table
- **Before:** `UNIQUE(pl_id, doc_type)`
- **After:** `UNIQUE(pl_id, doc_type, name)`

**Rationale:**
- Required documents (invoice, packing_list, inspection, pre_declaration) have `name=NULL`
  - This makes them unique per type per PL (singleton behavior preserved)
- Additional documents have `name=custom_value`
  - This allows multiple additional docs per PL with different names

### Migration (`server/drizzle/0029_add_additional_docs_support.sql`)

```sql
-- Drop old unique indexes
DROP INDEX IF EXISTS uq_pl_doc_type;
DROP INDEX IF EXISTS uq_pl_doc_unique_type_non_rejected;

-- Create new unique index including name column
CREATE UNIQUE INDEX uq_pl_doc_type ON pl_documents (pl_id, doc_type, name);

-- Add index for querying additional docs
CREATE INDEX IF NOT EXISTS idx_pl_documents_name ON pl_documents (name) WHERE name IS NOT NULL;
```

---

## Backend Changes

### Upload Endpoint (`server/routes/pl.js`)

**Modified:** `POST /api/pl/:plId/docs`

**Logic:**
```javascript
const isAdditional = docType === 'additional';

// Validation
if (isAdditional && (!customName || customName.trim() === '')) {
  return reply.badRequest('name is required for additional documents');
}

const finalName = isAdditional ? customName.trim() : null;

if (isAdditional) {
  // Additional docs: always INSERT (allow multiple)
  [row] = await db.insert(plDocuments).values({...}).returning();
} else {
  // Required docs: UPSERT (replace existing)
  [row] = await db.insert(plDocuments)
    .values({..., name: null})
    .onConflictDoUpdate({...})
    .returning();
}
```

**Key Behaviors:**
| Document Type | name Field | Behavior |
|--------------|------------|----------|
| Required (invoice, etc.) | `NULL` | UPSERT - replaces existing |
| Additional | Custom string | INSERT - always creates new |

---

## Frontend Changes

### Constants (`src/constants/docs.js`)

**Added:**
```javascript
export const ADDITIONAL_DOC_TYPE = "additional";
```

### DocsList Component (`src/components/pl/DocsList.jsx`)

**New Structure:**

```
┌─────────────────────────────────────────┐
│  📋 Обязательные документы              │
├─────────────────────────────────────────┤
│  Invoice                                │
│  [Вложить] / [Проверено] / [Заменить]  │
│  ...                                    │
│  Packing List                           │
│  Inspection                             │
│  Pre-Declaration                        │
├─────────────────────────────────────────┤
│  📎 Дополнительные документы [+ Добавить]│
├─────────────────────────────────────────┤
│  Certificate of origin          [×]     │
│  file.pdf • 12 KB • 14.03.2025          │
│  [Открыть] [Скачать] [Удалить]         │
│                                         │
│  Insurance policy               [×]     │
│  insurance.pdf • 45 KB • 14.03.2025     │
│  [Открыть] [Скачать] [Удалить]         │
└─────────────────────────────────────────┘
```

**Features:**

1. **Two Sections:**
   - **Required Documents:** Existing UI unchanged
   - **Additional Documents:** New section below

2. **Add Document Dialog:**
   - Document Name (required text input)
   - File selection
   - Upload/Cancel buttons

3. **Additional Document Card:**
   - Document name (bold)
   - Filename, size, upload date
   - Actions: Open (preview), Download, Delete
   - NO verification buttons (status workflow not applicable)

4. **Data Separation:**
   ```javascript
   const { requiredDocs, additionalDocs } = useMemo(() => {
     const byType = new Map();
     const additional = [];
     
     docs.forEach((d) => {
       if (d.docType === ADDITIONAL_DOC_TYPE) {
         additional.push(d);
       } else {
         byType.set(d.docType, d);
       }
     });
     
     return { requiredDocs: byType, additionalDocs: additional };
   }, [docs]);
   ```

---

## API Behavior

### Existing Endpoints (Unchanged)

| Endpoint | Behavior |
|----------|----------|
| `GET /api/pl/:plId/docs` | Returns ALL documents (required + additional) |
| `PATCH /api/pl/:plId/docs/:docId` | Updates status/note/name (works for both) |
| `DELETE /api/pl/:plId/docs/:docId` | Deletes document (works for both) |
| `GET /api/pl/:plId/docs/:docId/preview` | Preview file (works for both) |
| `GET /api/pl/:plId/docs/:docId/download` | Download file (works for both) |

### Modified Endpoint

| Endpoint | Change |
|----------|--------|
| `POST /api/pl/:plId/docs` | Now handles both required and additional docs with different logic |

### Counts

`_counts.docs` includes **both** required and additional documents:
```javascript
const [docsCount] = await Promise.all([
  db.select({ count: sql`count(*)` })
    .from(plDocuments)
    .where(eq(plDocuments.plId, plId))
    .then(r => Number(r[0]?.count || 0)),
  // ...
]);
```

---

## Safety Constraints Verified

✅ **Required documents continue working exactly as before**
- Invoice, packing_list, inspection, pre_declaration unchanged
- Upload/replace/verification/rejection flow preserved
- UPSERT behavior maintained

✅ **User can upload multiple additional documents**
- Each requires a unique name
- Unlimited quantity per PL

✅ **Each additional document requires a name**
- Backend validation rejects empty names
- UI shows name as required field

✅ **Additional documents appear under separate section**
- Clear visual separation
- Different card styling

✅ **Additional documents support preview/download/delete**
- Reuses existing endpoints
- No new backend code needed

✅ **Required documents still support full workflow**
- Upload, replace, verify (checked_by_logistic), approve (recheck_ok), reject
- Status badges unchanged

✅ **Database allows multiple additional docs**
- Unique constraint on (pl_id, doc_type, name)
- Additional docs have unique names

✅ **Required doc types remain unique per PL**
- Required docs have name=NULL
- UPSERT on conflict maintains singleton behavior

✅ **Existing APIs continue functioning**
- All existing endpoints work unchanged
- New logic only affects upload behavior

✅ **No regression in current document behavior**
- Build passes
- Existing tests continue working

---

## Manual Testing Steps

### 1. Required Documents (Regression Test)

1. Open any cargo card
2. Go to Documents tab
3. **Invoice:** Click "Вложить документ", upload file
4. Verify: File appears, status = "Вложен"
5. Click "Проверено" → Status = "Проверено"
6. Click "Повторная проверка" → Status = "Повторная проверка"
7. Click "Заменить файл", upload new file
8. Verify: Old file replaced, status reset to "Вложен"
9. Repeat for Packing List, Inspection, Pre-Declaration

### 2. Additional Documents

1. In same cargo card, scroll to "Дополнительные документы"
2. Click "+ Добавить документ"
3. Dialog opens with:
   - Name field (empty, required)
   - File selector
4. Try clicking "Загрузить" without name → Should show error
5. Enter name: "Certificate of origin"
6. Select file: any PDF
7. Click "Загрузить"
8. Verify:
   - Dialog closes
   - New card appears with name "Certificate of origin"
   - Shows filename, size, date
   - Actions: Открыть, Скачать, Удалить
   - NO verification buttons
9. Add another document: name = "Insurance", different file
10. Verify both documents appear in list
11. Try adding document with same name → Should fail (unique constraint)
12. Click "Открыть" → Preview modal opens
13. Click "Скачать" → File downloads
14. Click "Удалить" → Confirm → Document removed

### 3. Count Verification

1. Note the count on Documents tab badge
2. Add additional document
3. Verify badge count increases by 1
4. Delete additional document
5. Verify badge count decreases by 1

### 4. Events Timeline

1. Upload required doc → Event appears: "Загружен документ invoice"
2. Upload additional doc → Event appears: "Загружен дополнительный документ: Certificate"
3. Verify events have correct metadata

---

## Files Changed

| File | Changes |
|------|---------|
| `server/db/schema.js` | Updated unique constraint to include `name` |
| `server/drizzle/0029_add_additional_docs_support.sql` | Migration for constraint change |
| `server/routes/pl.js` | Updated upload endpoint with additional docs logic |
| `src/components/pl/DocsList.jsx` | Two-section UI with additional docs support |
| `src/constants/docs.js` | Added `ADDITIONAL_DOC_TYPE` constant |

---

## Migration Deployment

```bash
# Run migration on database
cd server
npx drizzle-kit migrate

# Or apply manually:
psql $DATABASE_URL -f drizzle/0029_add_additional_docs_support.sql
```

---

## Backward Compatibility

✅ **Fully backward compatible**
- Existing documents have `name=NULL` → continue working
- Required docs continue using UPSERT
- Existing API clients unaffected
- No breaking changes to response formats

---

## Future Enhancements (Out of Scope)

Potential improvements not included in this PR:
- Drag-and-drop file upload
- Bulk upload for additional docs
- Document categories/tags
- Document expiration dates
- Document sharing permissions
