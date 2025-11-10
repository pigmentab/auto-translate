# Per-Locale Translation Exclusions

## How It Works

Translation exclusions are **completely independent per locale**. This means:

- Excluding a field in **English** does NOT affect **German** or any other locale
- Each locale maintains its own separate list of excluded fields
- You can exclude different fields in different locales

## Database Structure

The `translation-exclusions` collection stores one record per `(collection, documentId, locale)` combination:

```javascript
{
  id: "abc123",
  collection: "posts",
  documentId: "post-001",
  locale: "en",  // THIS RECORD IS FOR ENGLISH ONLY
  excludedPaths: [
    { path: "title" },
    { path: "content.0.description" }
  ]
}

// Separate record for German
{
  id: "def456",
  collection: "posts",
  documentId: "post-001",
  locale: "de",  // THIS RECORD IS FOR GERMAN ONLY
  excludedPaths: [
    { path: "description" },  // Different fields!
    { path: "seo.metaTitle" }
  ]
}
```

## Example Scenario

### Setup
- Default locale: Swedish (`sv`)
- Secondary locales: English (`en`), German (`de`)
- Document: A blog post with `title`, `description`, and `content` fields

### Step-by-Step

1. **Create post in Swedish:**
   - Title: "Katter är fantastiska"
   - Description: "En artikel om katter"
   - Save & Publish → Translations created for `en` and `de`

2. **Switch to English locale:**
   - Title automatically translated: "Cats are fantastic"
   - Description automatically translated: "An article about cats"
   - **Click 🔒 on title** → Title is now locked for English
   - Database now has:
     ```javascript
     {
       collection: "posts",
       documentId: "post-001",
       locale: "en",
       excludedPaths: [{ path: "title" }]
     }
     ```

3. **Switch to German locale:**
   - Title automatically translated: "Katzen sind fantastisch"
   - Description automatically translated: "Ein Artikel über Katzen"
   - **Click 🔒 on description** → Description is now locked for German
   - Database now has **TWO separate records**:
     ```javascript
     // English exclusions
     {
       locale: "en",
       excludedPaths: [{ path: "title" }]
     }
     // German exclusions (independent from English!)
     {
       locale: "de",
       excludedPaths: [{ path: "description" }]
     }
     ```

4. **Update Swedish (default) post:**
   - Change title and description
   - Save & Publish
   - **English**: Description is updated, title stays locked ✅
   - **German**: Title is updated, description stays locked ✅

## Verifying It Works

### Using Browser Console

With the improved debugging, open your browser's developer console and watch for logs when toggling exclusions:

```javascript
// When switching to English and loading the page:
[TranslationControl] Loading exclusion state for: {
  collection: "posts",
  documentId: "post-001",
  locale: "en",  // ← Currently in English
  fieldPath: "title"
}
[TranslationControl] Loaded exclusions for en: {
  excludedPaths: ["title"],  // ← Only English exclusions
  isFieldExcluded: true,
  fieldPath: "title"
}

// When switching to German and loading the page:
[TranslationControl] Loading exclusion state for: {
  collection: "posts",
  documentId: "post-001",
  locale: "de",  // ← Now in German
  fieldPath: "title"
}
[TranslationControl] Loaded exclusions for de: {
  excludedPaths: ["description"],  // ← Different exclusions!
  isFieldExcluded: false,  // ← Title NOT excluded in German
  fieldPath: "title"
}
```

### Using the Admin Panel

1. **Go to the Translation Exclusions collection** (`/admin/collections/translation-exclusions`)
2. You'll see separate records for each locale:
   - Collection: `posts` | Document ID: `post-001` | Locale: `en` | Excluded: `title`
   - Collection: `posts` | Document ID: `post-001` | Locale: `de` | Excluded: `description`
3. Each record is completely independent

## Common Issues & Solutions

### Issue: "Fields from one locale appear excluded in another"

**Symptoms:**
- You exclude `title` in English
- Switch to German
- `title` appears as 🔒 locked in German too

**Causes & Fixes:**

1. **Browser Cache:**
   - **Solution:** Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
   - The React component should reload exclusions when locale changes

2. **Query Not Filtering by Locale:**
   - **Check console logs:** Look for warnings like:
     ```
     [TranslationControl] Locale mismatch in loaded exclusion!
     {expected: "de", got: "en"}
     ```
   - If you see this, the query returned the wrong record
   - **Solution:** Check that your `translation-exclusions` collection has proper indexes on the `locale` field

3. **Multiple Records with Same Locale:**
   - **Check:** Query the database directly:
     ```javascript
     db.translation_exclusions.find({
       collection: "posts",
       documentId: "post-001"
     })
     ```
   - You should see ONE record per locale, not multiple
   - **Solution:** Delete duplicate records

### Issue: "Excluding a field saves exclusions for all locales"

**Symptoms:**
- You exclude `description` in German
- The `title` exclusion from English also gets saved to German

**Debug Steps:**

1. Open browser console
2. Click the exclusion button
3. Watch for logs:
   ```javascript
   [TranslationControl] Fetching exclusions for: {
     locale: "de",  // ← Should match current locale
     fieldPath: "description"
   }
   [TranslationControl] Found exclusions: [...]
   [TranslationControl] Current excluded paths for de: ["description"]
   // NOT ["title", "description"] ← If you see this, there's a bug
   
   [TranslationControl] Saving exclusions: {
     locale: "de",  // ← Should be "de"
     excludedPaths: [{path: "description"}]
     // NOT [{path: "title"}, {path: "description"}]
   }
   ```

4. If the logs show the wrong locale or wrong paths, please report it as a bug with the console output

## Testing Per-Locale Behavior

### Test Script

```javascript
// 1. Open browser console on a post edit page
// 2. Paste this test script

async function testPerLocaleExclusions() {
  const collection = "posts"
  const documentId = "YOUR_POST_ID" // Replace with actual ID
  
  // Query English exclusions
  const enResponse = await fetch(
    `/api/translation-exclusions?` + new URLSearchParams({
      where: JSON.stringify({
        and: [
          { collection: { equals: collection } },
          { documentId: { equals: documentId } },
          { locale: { equals: "en" } }
        ]
      })
    })
  )
  const enData = await enResponse.json()
  console.log("English exclusions:", enData.docs)
  
  // Query German exclusions
  const deResponse = await fetch(
    `/api/translation-exclusions?` + new URLSearchParams({
      where: JSON.stringify({
        and: [
          { collection: { equals: collection } },
          { documentId: { equals: documentId } },
          { locale: { equals: "de" } }
        ]
      })
    })
  )
  const deData = await deResponse.json()
  console.log("German exclusions:", deData.docs)
  
  // They should be different!
  console.log("Are they the same?", JSON.stringify(enData) === JSON.stringify(deData))
}

testPerLocaleExclusions()
```

Expected output:
```
English exclusions: [{locale: "en", excludedPaths: [{path: "title"}]}]
German exclusions: [{locale: "de", excludedPaths: [{path: "description"}]}]
Are they the same? false  // ← Should be false!
```

## Architecture

### Component Logic (TranslationControl.tsx)

```typescript
// When loading exclusions
useEffect(() => {
  // Query ONLY for current locale
  const whereQuery = {
    and: [
      { collection: { equals: collectionSlug } },
      { documentId: { equals: id } },
      { locale: { equals: currentLocale } }, // ← KEY: Filters by current locale
    ],
  }
  // Fetch and set state...
}, [currentLocale]) // ← Reloads when locale changes

// When saving exclusions
const toggleExclusion = async () => {
  // Fetch CURRENT locale's exclusions
  const currentExcludedPaths = await fetchExclusionsFor(currentLocale)
  
  // Add/remove just this field
  if (add) {
    currentExcludedPaths.push(fieldPath)
  } else {
    currentExcludedPaths = currentExcludedPaths.filter(p => p !== fieldPath)
  }
  
  // Save back to THE SAME locale
  await saveExclusions({
    locale: currentLocale, // ← KEY: Saves to current locale only
    excludedPaths: currentExcludedPaths
  })
}
```

### Translation Logic (index.ts)

```typescript
// During translation from Swedish → English
const excludedPaths = await translationService.getExclusions(
  payload,
  "posts",
  docId,
  "en" // ← Fetches ONLY English exclusions
)

// During translation from Swedish → German
const excludedPaths = await translationService.getExclusions(
  payload,
  "posts",
  docId,
  "de" // ← Fetches ONLY German exclusions (different from English!)
)
```

## Admin UI Improvements

The `translation-exclusions` collection now has:

- **Clear description:** "Each locale can have its own set of excluded fields"
- **Sidebar fields:** Collection, Document ID, and Locale are read-only and visible
- **Array label:** "Excluded Fields for this Locale" (emphasizes locale-specific)
- **Default columns:** Shows locale in the list view
- **Field descriptions:** Explains that exclusions are per-locale

## Summary

✅ **Exclusions ARE per-locale** - The architecture is correct  
✅ **Each locale has independent exclusions** - Database structure supports this  
✅ **Component queries by locale** - UI loads correct exclusions  
✅ **Saving is locale-specific** - Only saves to current locale  

If you're experiencing cross-locale contamination, use the debugging logs to identify where the issue is occurring, and report it with the console output.

## Need Help?

If you're still experiencing issues:

1. **Enable console logs** (they're now always on)
2. **Reproduce the issue** while watching the console
3. **Copy the console output** showing the problem
4. **Check the translation-exclusions collection** in admin to see what's actually stored
5. **Report with:** 
   - Console logs
   - Database records (from translation-exclusions collection)
   - Steps to reproduce

