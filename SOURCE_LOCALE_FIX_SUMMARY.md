# Fix Summary: Default Locale Exclusions

## Issue Identified

**Question:** What happens when you exclude fields in the **default/source locale (SV)** instead of secondary locales?

**Answer:** Previously, the lock button would show in ALL locales (including SV), but **exclusions in the default locale had no effect** on translations.

## Why It Didn't Work

### The Problem

```typescript
// When translating SV → EN
const excludedPaths = await getExclusions(
  collection,
  doc.id,
  'en'  // ← Queries for TARGET locale
)

// If you locked a field in SV:
// - It saved with locale: "sv"
// - But translation queries for locale: "en"
// - So SV exclusions were never used
```

### The Conceptual Issue

**Exclusions control what gets translated TO a locale, not FROM a locale.**

- **Default locale (SV)** = Source of translations
- **Secondary locales (EN, DE)** = Targets of translations
- Locking a field in a target = "Don't overwrite my custom translation"
- Locking a field in the source = Doesn't make sense conceptually

## The Fix

### Changed Files

1. **src/components/TranslationControl.tsx**
   - Added `defaultLocale` prop
   - Added check: `if (currentLocale === defaultLocale) return null`
   - Component now only renders in secondary locales

2. **src/utilities/injectTranslationControls.ts**
   - Updated function signature to accept `defaultLocale`
   - Pass `defaultLocale` to TranslationControl via `clientProps`
   - Updated recursive calls to pass `defaultLocale`

3. **src/index.ts**
   - Pass `defaultLocale` when calling `injectTranslationControls()`

## Current Behavior (After Fix)

### In Default Locale (SV)

```
┌─────────────────────────────────┐
│ Locale: SV (Svenska)            │
│                                  │
│ Title                            │
│ ┌─────────────────────────────┐ │
│ │ Nya produkter              │ │  ← No lock button
│ └─────────────────────────────┘ │
│                                  │
│ Description                      │
│ ┌─────────────────────────────┐ │
│ │ Vi lanserar produkter      │ │  ← No lock button
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**What you see:**
- ❌ No lock buttons
- ✅ Just edit content normally
- ✅ Changes trigger translations to EN, DE, etc.

### In Secondary Locale (EN)

```
┌─────────────────────────────────┐
│ Locale: EN (English)            │
│                                  │
│ Title            🌐 Auto-translate│  ← Lock button appears
│ ┌─────────────────────────────┐ │
│ │ New products               │ │
│ └─────────────────────────────┘ │
│                                  │
│ Description      🌐 Auto-translate│  ← Lock button appears
│ ┌─────────────────────────────┐ │
│ │ We're launching products   │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**What you see:**
- ✅ Lock buttons on all localized fields
- ✅ Click to toggle 🌐 ↔ 🔒
- ✅ Locked fields won't be overwritten when SV changes

## Example Workflow

### 1. Edit in Default Locale (SV)

```typescript
// In Swedish (default)
{
  title: "Våra produkter",
  description: "Vi erbjuder fantastiska produkter"
}
```

- No lock buttons visible
- Just edit and Save & Publish
- Triggers translation to EN and DE

### 2. Customize English Translation

```typescript
// Switch to EN locale
{
  title: "Our products",  // Auto-translated
  description: "We offer fantastic products"  // Auto-translated
}
```

- Lock buttons now visible (🌐 on both fields)
- You want a better marketing title
- **Action:** Click 🔒 on title
- Edit to: "Revolutionary Product Lineup!"
- Title now shows: 🔒 (locked)

### 3. Update Swedish Original

```typescript
// Back to SV
{
  title: "Våra uppdaterade produkter",  // Changed
  description: "Vi erbjuder ännu fler produkter"  // Changed
}
```

- No lock buttons (still just editing source)
- Save & Publish

### 4. Result in English

```typescript
// In EN after update
{
  title: "Revolutionary Product Lineup!",  // 🔒 Unchanged (locked)
  description: "We offer even more products"  // 🌐 Updated (not locked)
}
```

## Use Cases for Global Exclusions

If you want to prevent a field from being translated to **ANY** secondary locale, use collection-level config:

```typescript
autoTranslate({
  collections: {
    posts: {
      enabled: true,
      excludeFields: [
        'slug',           // Never translate slugs
        'authorBio',      // Author bios are locale-specific
        'technicalSpecs', // Technical specs don't need translation
      ],
    },
  },
})
```

**Difference:**
- **Field-level lock (🔒)**: Controls specific locale (EN locked, DE unlocked)
- **Global exclusion**: Field never translated to ANY locale

## Testing the Fix

### Test 1: Verify No Lock Buttons in Default Locale

1. Start dev server: `pnpm dev`
2. Go to Posts in admin
3. Make sure you're in **SV (Svenska)** locale
4. Edit any post
5. **Expected:** No lock buttons visible on any field

### Test 2: Verify Lock Buttons in Secondary Locales

1. In the same post, switch to **EN (English)**
2. **Expected:** Lock buttons (🌐) appear on all localized fields
3. Switch to **DE (Deutsch)**
4. **Expected:** Lock buttons appear here too

### Test 3: Verify Locking Works Per-Locale

1. In **EN**: Lock the `title` field (🔒)
2. In **DE**: Lock the `description` field (🔒)
3. Switch back to **SV**
4. Change both `title` and `description`
5. Save & Publish
6. Check **EN**: 
   - Title should NOT update (locked) ✅
   - Description should update (not locked) ✅
7. Check **DE**:
   - Title should update (not locked) ✅
   - Description should NOT update (locked) ✅

### Test 4: Verify Console Logs

Open browser console and watch for:

```javascript
// When in SV (default)
// Should see NO TranslationControl logs at all
// (Component doesn't render)

// When in EN
[TranslationControl] Loading exclusion state for: {
  collection: "posts",
  documentId: "xyz",
  locale: "en",  // ← Should be "en"
  fieldPath: "title"
}
```

## Migration Notes

### If You Had Exclusions in Default Locale Before

Old exclusion records with `locale: "sv"` (your default) will still exist in the database but:
- ✅ They have no effect on translations (never did)
- ✅ They won't cause errors
- ✅ The UI now prevents creating new ones
- 🧹 You can safely delete them from `translation-exclusions` collection if you want

### Query to Find Them

```javascript
// In Payload admin or MongoDB
db.translation_exclusions.find({ locale: "sv" })

// These can be deleted - they never had any effect
db.translation_exclusions.deleteMany({ locale: "sv" })
```

## Documentation Created

1. **DEFAULT_LOCALE_EXCLUSIONS.md** - Comprehensive guide covering:
   - Why lock buttons only show in secondary locales
   - Visual examples of UI in different locales
   - Example workflows
   - Common questions
   - Best practices
   - Technical details

2. **Updated CHANGELOG.md** with:
   - Bug fix details
   - Technical explanation
   - Documentation references

## Summary

✅ **Lock buttons now only show in secondary locales**  
✅ **Default locale is uncluttered** - no confusing UI elements  
✅ **Conceptually correct** - you lock translations, not source content  
✅ **Backward compatible** - old exclusions in default locale just ignored  
✅ **Well documented** - clear explanation of behavior  

The fix makes the UI clearer and aligns with the conceptual model:
- **Default locale** = Edit source content freely
- **Secondary locales** = Review translations, lock custom ones

---

**Status:** ✅ Fixed and Documented  
**Version:** 1.0.1  
**Breaking Changes:** None  
**Migration Required:** No


