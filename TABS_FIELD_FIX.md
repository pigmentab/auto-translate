# Tabs Field Support - Fix Documentation

## Issue

Translation controls were not appearing for fields inside `tabs` fields. The plugin was not correctly handling the path structure for fields within tabs.

## Root Cause

Payload's `tabs` field is a **UI container** that doesn't create a path segment in the data structure. However, individual tabs can be:

1. **Unnamed tabs** - Fields are stored at the root level with their natural names
2. **Named tabs** (with `name` property) - Fields are stored under the tab's name

The plugin was incorrectly passing the tabs field name as part of the path to nested fields.

## The Fix

### Changes Made

1. **Skip translation controls on tabs fields themselves**
   - Added `type === 'tabs'` to the list of container fields to skip
   - Tabs are just UI containers, not actual data fields

2. **Correct path handling for fields inside tabs**
   - For **unnamed tabs**: Use the parent path (don't add any segment)
   - For **named tabs**: Use the tab's `name` as the path segment

### Code Changes

```typescript
// Skip adding controls to container fields
const shouldSkipControl =
  clonedField.type === 'group' ||
  clonedField.type === 'blocks' ||
  clonedField.type === 'array' ||
  clonedField.type === 'tabs'  // ← Added

// Handle tabs recursion with correct paths
if ('tabs' in clonedField && Array.isArray(clonedField.tabs)) {
  clonedField.tabs = clonedField.tabs.map((tab: any) => {
    if (tab.fields) {
      // If the tab has a name, use it as the path segment
      // Otherwise, use the parent path (tabs field doesn't create a path)
      const tabPath = tab.name 
        ? (parentPath ? `${parentPath}.${tab.name}` : tab.name)
        : parentPath
      
      return {
        ...tab,
        fields: injectTranslationControls(tab.fields, defaultLocale, tabPath),
      }
    }
    return tab
  })
}
```

## Example Structure

### Collection Definition

```typescript
{
  name: 'contentFields',
  type: 'tabs',
  tabs: [
    {
      label: 'Hero',
      // No 'name' property = unnamed tab
      fields: [
        {
          name: 'hero',
          type: 'group',
          fields: [
            { name: 'label', type: 'text', localized: true },
            { name: 'title', type: 'text', localized: true },
          ]
        }
      ]
    },
    {
      name: 'meta',  // ← Has 'name' property = named tab
      label: 'SEO',
      fields: [
        { name: 'metaTitle', type: 'text', localized: true },
        { name: 'metaDescription', type: 'textarea', localized: true },
      ]
    }
  ]
}
```

### Data Structure

```javascript
{
  contentFields: /* tabs field - doesn't store data */,
  
  // Hero tab (unnamed) - fields at root level
  hero: {
    label: 'Welcome',
    title: 'Hero Title'
  },
  
  // Meta tab (named) - fields under 'meta'
  meta: {
    metaTitle: 'Page Title',
    metaDescription: 'Page description'
  }
}
```

### Field Paths for Translation Controls

```javascript
// Hero tab fields (unnamed tab)
'hero.label'  → Shows translation control ✅
'hero.title'  → Shows translation control ✅

// Meta tab fields (named tab)
'meta.metaTitle'       → Shows translation control ✅
'meta.metaDescription' → Shows translation control ✅

// Tabs field itself
'contentFields'  → NO translation control ❌ (it's just UI)
```

## Testing

### Test Collection Added

A `landing-pages` collection has been added to `/dev/payload.config.ts` for testing tabs:

```typescript
{
  slug: 'landing-pages',
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
    },
    {
      name: 'contentFields',
      type: 'tabs',
      tabs: [
        {
          label: 'Hero',
          // Unnamed tab
          fields: [
            {
              name: 'hero',
              type: 'group',
              localized: true,
              fields: [
                { name: 'label', type: 'text', localized: true },
                { name: 'title', type: 'text', localized: true },
                { name: 'description', type: 'textarea', localized: true },
              ],
            },
          ],
        },
        {
          label: 'Content',
          // Unnamed tab
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              localized: true,
              blocks: [...],
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          // Named tab
          localized: true,
          fields: [
            { name: 'metaTitle', type: 'text', localized: true },
            { name: 'metaDescription', type: 'textarea', localized: true },
          ],
        },
      ],
    },
  ],
}
```

### How to Test

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Create a Landing Page** in Swedish (SV):
   - Fill in title: "Test Landing Page"
   - Go to **Hero tab** (unnamed):
     - Hero Label: "Välkommen"
     - Hero Title: "Huvudrubrik"
     - Hero Description: "Beskrivning"
   - Go to **SEO tab** (named):
     - Meta Title: "SEO Titel"
     - Meta Description: "SEO Beskrivning"

3. **Save & Publish**

4. **Switch to English (EN)**

5. **Verify translation controls appear**:
   - ❌ No control on "Content Fields" tabs container
   - ✅ Control on Hero → Label
   - ✅ Control on Hero → Title
   - ✅ Control on Hero → Description
   - ✅ Control on Meta Title
   - ✅ Control on Meta Description

6. **Lock a field** (e.g., Hero Label)

7. **Switch to Swedish**, change Hero Label

8. **Save & Publish**

9. **Switch back to English**

10. **Verify**: Hero Label should NOT be overwritten (locked works)

### Expected Console Output

When loading the page in English:

```javascript
[TranslationControl] Loading exclusion state for: {
  collection: "landing-pages",
  documentId: "673...",
  fieldPath: "hero.label",  // ← Unnamed tab: field path at root
  locale: "en"
}

[TranslationControl] Loading exclusion state for: {
  collection: "landing-pages",
  documentId: "673...",
  fieldPath: "meta.metaTitle",  // ← Named tab: field path under 'meta'
  locale: "en"
}
```

## Edge Cases Handled

### 1. Nested Tabs (Not Common)

If you have tabs inside tabs:

```typescript
{
  type: 'tabs',
  tabs: [
    {
      name: 'outer',
      fields: [
        {
          name: 'inner',
          type: 'tabs',
          tabs: [...]
        }
      ]
    }
  ]
}
```

Path for fields in inner tabs: `outer.{innerTabName}.fieldName`

### 2. Tabs with Groups/Blocks/Arrays

```typescript
{
  type: 'tabs',
  tabs: [
    {
      label: 'Content',
      fields: [
        {
          name: 'sections',
          type: 'array',  // ← Array inside unnamed tab
          localized: true,
          fields: [
            { name: 'title', type: 'text', localized: true }
          ]
        }
      ]
    }
  ]
}
```

- ❌ No control on `sections` array itself
- ✅ Control on each item: `sections.0.title`, `sections.1.title`, etc.

### 3. Tab with `localized: true`

When a tab has `localized: true`:

```typescript
{
  name: 'meta',
  localized: true,  // ← This is a shorthand
  fields: [...]
}
```

This doesn't mean the tab UI is localized. It's just a convenience that indicates fields within should default to localized. The plugin correctly ignores this and only adds controls to the actual fields.

## Related Files

- `src/utilities/injectTranslationControls.ts` - Main logic for handling tabs
- `dev/payload.config.ts` - Test collection with tabs
- `src/components/TranslationControl.tsx` - UI component (uses runtime paths from Payload)

## Summary

✅ **Tabs field** - No translation control (UI container)  
✅ **Unnamed tab fields** - Controls with natural paths (e.g., `hero.title`)  
✅ **Named tab fields** - Controls with prefixed paths (e.g., `meta.metaTitle`)  
✅ **Nested structures** - Correctly handled within tabs  
✅ **Document isolation** - Each document has independent exclusions

