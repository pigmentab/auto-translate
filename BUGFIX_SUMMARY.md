# Bug Fixes Summary

## Issues Fixed

### 1. ✅ Translation Exclusions Shared Across Documents

**Problem**: When setting a field to the exclusion list in one document (e.g., Document ID 1), it would appear as excluded in other documents (e.g., Document ID 2, 3).

**Root Cause**: React was reusing component instances when navigating between documents, and the `isExcluded` state wasn't being reset. When switching from Document 1 (where title was locked) to a new document or Document 2, the component would retain the previous state.

**Fix**: 
- Added state reset in the `useEffect` hook when there's no document ID or when the document ID changes
- The component now properly resets to `isExcluded: false` when navigating to a new document

```typescript
// src/components/TranslationControl.tsx
useEffect(() => {
  // Reset state when switching documents or when there's no ID (new document)
  if (!id || !effectiveCollectionSlug) {
    setIsExcluded(false) // Reset to default state
    return
  }
  // ... load exclusions for current document
}, [id, effectiveCollectionSlug, currentLocale, fieldPath])
```

### 2. ✅ Duplicate Translation Controls for Group Fields

**Problem**: When a collection had a group field with localized fields inside, the translation control button was shown twice:
1. Once on the group field itself (e.g., `eventSidebar`)
2. Once on nested fields (e.g., `eventSidebar.dataList`)

**Root Cause**: The auto-injection logic was adding translation controls to ALL localized fields, including container fields (groups, blocks, arrays) that shouldn't have controls themselves.

**Fix**: 
- Modified `injectTranslationControls` to skip adding controls to group, blocks, and array fields
- Only nested fields within these containers now receive translation controls

```typescript
// src/utilities/injectTranslationControls.ts
const shouldSkipControl =
  clonedField.type === 'group' ||
  clonedField.type === 'blocks' ||
  clonedField.type === 'array'

if ('localized' in clonedField && clonedField.localized === true && !shouldSkipControl) {
  // Add translation control
}
```

### 3. ✅ Translation Controls Not Visible for Blocks

**Problem**: When using blocks in a collection (e.g., page builder), translation controls weren't visible for fields inside blocks.

**Root Cause**: The component was using a static field path from configuration, which doesn't include runtime array/block indices (e.g., `layout.0.heading`).

**Fix**: 
- Enhanced `TranslationControl` component to accept Payload's runtime `path` prop
- This prop includes dynamic indices like `layout.0.heading`, `layout.1.text`, etc.
- Falls back to static `fieldPath` if runtime path isn't available

```typescript
// src/components/TranslationControl.tsx
type TranslationControlProps = {
  fieldPath?: string // Static path from config
  path?: string // Runtime path from Payload (includes indices)
  // ...
}

// Use runtime path with indices, fallback to static path
const fieldPath = payloadPath || clientFieldPath
```

## Testing Configuration Added

Created a comprehensive `pages` collection in `/dev/payload.config.ts` to test all scenarios:

```typescript
{
  slug: 'pages',
  fields: [
    // Simple localized field
    { name: 'title', type: 'text', localized: true },
    
    // Group field (should NOT show control on group itself)
    {
      name: 'seo',
      type: 'group',
      localized: true,
      fields: [
        { name: 'metaTitle', type: 'text', localized: true }, // Shows control ✅
        { name: 'metaDescription', type: 'textarea', localized: true }, // Shows control ✅
      ],
    },
    
    // Blocks field (should show controls on fields inside blocks)
    {
      name: 'layout',
      type: 'blocks',
      localized: true,
      blocks: [
        {
          slug: 'hero',
          fields: [
            { name: 'heading', type: 'text', localized: true }, // Shows control ✅
            { name: 'subheading', type: 'textarea', localized: true }, // Shows control ✅
          ],
        },
        {
          slug: 'content',
          fields: [
            { name: 'heading', type: 'text', localized: true }, // Shows control ✅
            { name: 'text', type: 'richText', localized: true }, // Shows control ✅
          ],
        },
      ],
    },
    
    // Array field (should show controls on nested fields)
    {
      name: 'features',
      type: 'array',
      localized: true,
      fields: [
        { name: 'title', type: 'text', localized: true }, // Shows control ✅
        { name: 'description', type: 'textarea', localized: true }, // Shows control ✅
      ],
    },
  ],
}
```

## How to Test the Fixes

### Test 1: Document Isolation

1. Start dev server: `pnpm dev`
2. Create **Post 1** in Swedish (SV)
3. Switch to English (EN)
4. Lock the `title` field (click 🔒 button)
5. Save
6. Create a **new Post 2**
7. Switch to English (EN)
8. **Expected**: Title should NOT be locked (should show 🌐 Auto-translate)
9. **Previous bug**: Title would show as 🔒 locked

### Test 2: Group Fields

1. Create a **Page** in Swedish (SV)
2. Add SEO settings (group field)
3. Switch to English (EN)
4. **Expected**: 
   - ❌ No translation control on the "SEO Settings" group itself
   - ✅ Translation controls appear on `metaTitle` field
   - ✅ Translation controls appear on `metaDescription` field

### Test 3: Blocks

1. Create a **Page** in Swedish (SV)
2. Add a "Hero" block to the layout
3. Fill in heading and subheading
4. Save & Publish (triggers translation)
5. Switch to English (EN)
6. **Expected**:
   - ❌ No translation control on the "Layout" blocks field itself
   - ✅ Translation control appears on `heading` field inside the hero block
   - ✅ Translation control appears on `subheading` field inside the hero block
7. Lock the `heading` field
8. Switch back to Swedish, change the heading
9. Save & Publish
10. Switch to English
11. **Expected**: Heading should NOT be overwritten (locked works correctly)

### Test 4: Arrays

1. Create a **Page** in Swedish (SV)
2. Add features (array field)
3. Add 2-3 feature items
4. Save & Publish
5. Switch to English (EN)
6. **Expected**:
   - ❌ No translation control on the "Features" array field itself
   - ✅ Translation controls appear on each feature's `title` field
   - ✅ Translation controls appear on each feature's `description` field

## Console Logging

The component now logs helpful debug information:

```javascript
// When loading exclusions
[TranslationControl] Loading exclusion state for: {
  collection: "posts",
  documentId: "673abc123def456",
  fieldPath: "title",
  locale: "en"
}

// When switching documents without ID (new document)
[TranslationControl] Loading exclusion state for: {
  collection: "posts",
  documentId: null,
  fieldPath: "title",
  locale: "en"
}
// State is reset to false automatically
```

## Files Modified

1. **src/components/TranslationControl.tsx**
   - Added state reset when document ID changes
   - Added support for Payload's runtime `path` prop
   - Enhanced logging for debugging

2. **src/utilities/injectTranslationControls.ts**
   - Skip translation controls for group, blocks, and array fields
   - Only add controls to actual translatable fields

3. **src/collections/translationExclusions.ts**
   - Updated description to clarify one record per document/locale

4. **dev/payload.config.ts**
   - Added comprehensive `pages` collection for testing
   - Includes groups, blocks, and arrays with localized fields

## Build Status

✅ **Build successful** - All TypeScript compilation errors resolved

```bash
npm run build
# Successfully compiled: 10 files with swc (110.06ms)
```

## Next Steps

1. Test the fixes manually following the test scenarios above
2. Verify console logs show correct document IDs
3. Confirm exclusions are properly isolated per document
4. Test with real-world content and edge cases

## Notes

- The component now properly handles document navigation
- React component state is reset when switching between documents
- Payload's runtime path prop provides accurate field paths with indices
- Group/blocks/array containers no longer show redundant controls

