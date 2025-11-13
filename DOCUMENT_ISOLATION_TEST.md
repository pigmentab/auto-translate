# Document Isolation Testing Guide

## Critical Fix Applied

Added **double verification** to ensure exclusions are **strictly per-document**:

1. The query filters by `documentId`
2. **NEW**: The response is validated to ensure `exclusion.documentId === id`
3. **NEW**: If the documentId doesn't match, the record is rejected

## How to Test

### Step 1: Start Dev Server

```bash
npm run dev
```

Open browser console (F12) to see detailed logs.

### Step 2: Create Post 1 and Lock a Field

1. Go to Posts → Create New
2. **Check console** - should see:
   ```
   [TranslationControl] Loading exclusion state for: {
     collection: "posts",
     documentId: "673abc123...",  ← Note this ID
     fieldPath: "title",
     locale: "sv"
   }
   ```

3. Fill in Swedish content:
   - Title: "Test Post 1"
   - Description: "Detta är post 1"

4. Save & Publish

5. Switch to English (EN) locale

6. **Check console** - should see:
   ```
   [TranslationControl] Query URL: /api/translation-exclusions?limit=1&where=...
   [TranslationControl] Where clause: {
     and: [
       { collection: { equals: "posts" } },
       { documentId: { equals: "673abc123..." } },  ← Filtering by THIS document
       { locale: { equals: "en" } }
     ]
   }
   [TranslationControl] No exclusions found for document 673abc123... locale en
   ```

7. Click the 🔒 button on **title** field

8. **Check console** - should see:
   ```
   [TranslationControl] Toggle - Query URL: /api/translation-exclusions?...
   [TranslationControl] Found exclusions: []
   [TranslationControl] Saving exclusions: {
     collection: "posts",
     documentId: "673abc123...",  ← Must be THIS document
     locale: "en",
     excludedPaths: [{ path: "title" }]
   }
   [TranslationControl] Created exclusions: { doc: {...} }
   ```

9. Title should now show 🔒 and "This field will not be overwritten..."

### Step 3: Create Post 2 (Should NOT Have Locked Fields)

1. Go to Posts → Create New
2. **CRITICAL - Check console immediately**:
   ```
   [TranslationControl] Loading exclusion state for: {
     collection: "posts",
     documentId: null,  ← NULL because it's a new document
     fieldPath: "title",
     locale: "sv"
   }
   ```
   State should reset to `isExcluded: false`

3. Fill in Swedish content:
   - Title: "Test Post 2"
   - Description: "Detta är post 2"

4. Save & Publish

5. **Check console** - should see:
   ```
   [TranslationControl] Loading exclusion state for: {
     collection: "posts",
     documentId: "673def456...",  ← DIFFERENT ID from Post 1
     fieldPath: "title",
     locale: "sv"
   }
   ```

6. Switch to English (EN) locale

7. **CRITICAL - Check console**:
   ```
   [TranslationControl] Query URL: /api/translation-exclusions?limit=1&where=...
   [TranslationControl] Where clause: {
     and: [
       { collection: { equals: "posts" } },
       { documentId: { equals: "673def456..." } },  ← Querying for Post 2's ID
       { locale: { equals: "en" } }
     ]
   }
   ```

8. **Expected Result**:
   - Title should show 🌐 Auto-translate (NOT 🔒)
   - NO message about "will not be overwritten"

9. If you see a warning like this, it means the query returned the wrong document:
   ```
   [TranslationControl] Document/Locale mismatch in loaded exclusion!
   {
     expectedLocale: "en",
     expectedDocId: "673def456...",
     gotLocale: "en", 
     gotDocId: "673abc123..."  ← This is Post 1's ID!
   }
   ```
   The component will **reject** this record and show the field as unlocked.

### Step 4: Verify Post 1 Still Has Locked Field

1. Go back to Post 1 (edit it)
2. Switch to English (EN)
3. **Check console**:
   ```
   [TranslationControl] Query URL: /api/translation-exclusions?...
   [TranslationControl] Where clause: {
     and: [
       { collection: { equals: "posts" } },
       { documentId: { equals: "673abc123..." } },  ← Post 1's ID
       { locale: { equals: "en" } }
     ]
   }
   [TranslationControl] Loaded exclusions for document 673abc123... locale en: {
     excludedPaths: ["title"],
     fieldPath: "title",
     isFieldExcluded: true
   }
   ```

4. Title should still show 🔒 (locked)

## What the Fix Does

### Before (Broken)

```typescript
if (exclusion.locale === currentLocale) {
  // ❌ Only checked locale, not documentId
  existingId = exclusion.id
  currentExcludedPaths = exclusion.excludedPaths.map(...)
}
```

If Payload returned a record for the wrong document, we'd use it anyway!

### After (Fixed)

```typescript
if (exclusion.locale === currentLocale && exclusion.documentId === id) {
  // ✅ Checks BOTH locale AND documentId
  existingId = exclusion.id
  currentExcludedPaths = exclusion.excludedPaths.map(...)
} else {
  console.warn('[TranslationControl] Document/Locale mismatch!')
  // ✅ Reject the record and use defaults
  existingId = null
  currentExcludedPaths = []
}
```

Now even if the query somehow returns the wrong record, we reject it!

## Debugging Checklist

If you still see exclusions being shared:

### 1. Check Document IDs in Console

When you create Post 2, look for:
```
documentId: "673def456..."  ← Should be DIFFERENT from Post 1
```

### 2. Check Query Where Clause

```javascript
{ documentId: { equals: "673def456..." } }  ← Must match current document
```

### 3. Check Response Validation

Look for either:
- "Loaded exclusions for document X" (documentId matches)
- "Document/Locale mismatch!" (documentId doesn't match - rejected)

### 4. Check Database

You can query the database directly to see all exclusions:

```javascript
// In Payload admin or MongoDB
db.translation_exclusions.find().pretty()
```

Expected structure:
```javascript
[
  {
    _id: "...",
    collection: "posts",
    documentId: "673abc123...",  ← Post 1
    locale: "en",
    excludedPaths: [{ path: "title" }]
  },
  {
    _id: "...",
    collection: "posts", 
    documentId: "673def456...",  ← Post 2 (if you locked something)
    locale: "en",
    excludedPaths: [{ path: "description" }]
  }
]
```

Each document should have its OWN record with its OWN documentId.

## If Issue Persists

If you're still seeing shared exclusions after this fix, please provide:

1. **Console logs** from both documents showing:
   - Document IDs
   - Query URLs
   - Where clauses
   - Response data

2. **Database dump** of translation-exclusions:
   ```bash
   # MongoDB
   db.translation_exclusions.find().pretty()
   
   # Or via Payload Admin
   # Go to Settings → Translation Exclusions
   # Copy all records
   ```

3. **Steps to reproduce** exactly what you're doing

This will help identify if the issue is:
- Query not filtering correctly
- Database having duplicate records  
- Component state not resetting properly
- Or something else

## Expected Behavior Summary

✅ **Correct**:
- Post 1 locks title → Only Post 1 has locked title
- Post 2 locks description → Only Post 2 has locked description
- Each document has independent exclusions

❌ **Incorrect (old bug)**:
- Post 1 locks title → Post 2 also shows title as locked
- Exclusions bleed between documents

