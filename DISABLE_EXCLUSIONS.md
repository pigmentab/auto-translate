# Disabling Translation Exclusions

## Overview

By default, the auto-translate plugin includes a field-level exclusion system that allows users to lock specific fields from auto-translation. However, some users may prefer a simpler setup without this complexity.

The `enableExclusions` option allows you to completely disable the exclusion system.

## Configuration

### Disable Exclusions (Simple Mode)

```typescript
import { autoTranslate } from '@pigment/auto-translate'

export default buildConfig({
  plugins: [
    autoTranslate({
      collections: {
        posts: true,
        pages: true,
      },
      enableExclusions: false, // ← Disable exclusions completely
    }),
  ],
})
```

### Enable Exclusions (Default)

```typescript
import { autoTranslate } from '@pigment/auto-translate'

export default buildConfig({
  plugins: [
    autoTranslate({
      collections: {
        posts: true,
        pages: true,
      },
      enableExclusions: true, // ← Default (can be omitted)
    }),
  ],
})
```

## What Happens When Disabled

When `enableExclusions: false`:

### ❌ Removed / Hidden
1. **Translation Exclusions Collection** - Not added to Payload CMS
2. **Translation Control Buttons** - No 🌐/🔒 buttons on fields
3. **Exclusion API Endpoints** - No `/api/translation-exclusions` endpoints
4. **Exclusion Queries** - No database queries for exclusions

### ✅ Still Works
1. **Auto-Translation** - All localized fields are always translated
2. **Translation Sync Toggle** - Document-level enable/disable still available
3. **Global excludeFields** - Config-level field exclusions still work
4. **Collection excludeFields** - Per-collection field exclusions still work
5. **Custom Providers** - All provider features work normally

## Use Cases

### When to Disable Exclusions

✅ **Good reasons to disable**:
- Simple content that doesn't need customization per locale
- Automated workflows where translations are always replaced
- Reducing UI complexity for non-technical editors
- Lower database overhead (no exclusion records)
- Simpler deployment (fewer collections/endpoints)

❌ **Bad reasons to disable**:
- You want custom translations per locale (need exclusions!)
- Marketing content that needs locale-specific messaging
- Legal/compliance content that must be customized
- SEO metadata that should differ per locale

### Simple Blog Example

```typescript
// Perfect for a simple blog where all content is always fully translated
autoTranslate({
  collections: {
    posts: true,
    categories: true,
  },
  enableExclusions: false, // Simple mode
  excludeFields: ['slug', 'author'], // Global exclusions still work
})
```

### E-commerce Product Catalog

```typescript
// Good for product catalogs where descriptions are always translated
autoTranslate({
  collections: {
    products: {
      enabled: true,
      excludeFields: ['sku', 'price'], // Per-collection exclusions still work
    },
  },
  enableExclusions: false, // No field-level locking needed
})
```

### Marketing Site (Keep Exclusions Enabled)

```typescript
// Marketing sites need exclusions for locale-specific content
autoTranslate({
  collections: {
    pages: true,
    'landing-pages': true,
  },
  enableExclusions: true, // ← Keep enabled for marketing customization
})
```

## Comparison Table

| Feature | `enableExclusions: true` (Default) | `enableExclusions: false` |
|---------|-----------------------------------|---------------------------|
| **Translation Exclusions Collection** | ✅ Added | ❌ Not added |
| **Translation Control Buttons** | ✅ Shows 🌐/🔒 on fields | ❌ Hidden |
| **Field-Level Locking** | ✅ Users can lock specific fields | ❌ Not available |
| **Auto-Translation** | ✅ Translates unlocked fields | ✅ Translates all fields |
| **Global `excludeFields`** | ✅ Works | ✅ Works |
| **Collection `excludeFields`** | ✅ Works | ✅ Works |
| **Translation Sync Toggle** | ✅ Works | ✅ Works |
| **Database Records** | Creates exclusion records | No exclusion records |
| **Admin UI Complexity** | More options/controls | Simpler UI |
| **API Endpoints** | Adds exclusion endpoints | No exclusion endpoints |
| **Performance** | Slight overhead (exclusion queries) | Faster (no exclusion queries) |

## Migration

### Disabling Exclusions in Existing Project

If you have an existing project with exclusions and want to disable them:

```typescript
// Before
autoTranslate({
  collections: { posts: true },
  // enableExclusions: true (default)
})

// After
autoTranslate({
  collections: { posts: true },
  enableExclusions: false, // ← Add this
})
```

**What happens**:
1. Existing exclusion records remain in database (ignored)
2. Translation controls disappear from UI
3. All fields are now always translated
4. You can manually delete the `translation-exclusions` collection if desired

### Re-enabling Exclusions

```typescript
// Disabled
autoTranslate({
  collections: { posts: true },
  enableExclusions: false,
})

// Re-enable
autoTranslate({
  collections: { posts: true },
  enableExclusions: true, // ← Change to true
})
```

**What happens**:
1. Translation exclusions collection is added back
2. Translation controls appear on fields
3. All existing content has no exclusions (users can lock fields going forward)
4. Previous exclusion records (if any) are restored

## Config-Level Exclusions Still Work

Even with `enableExclusions: false`, you can still exclude fields globally:

```typescript
autoTranslate({
  collections: {
    posts: {
      enabled: true,
      excludeFields: ['slug', 'author'], // ← Still works!
    },
  },
  excludeFields: ['id', 'createdAt'], // ← Global exclusions still work!
  enableExclusions: false, // No field-level UI controls
})
```

**Difference**:
- **Config-level**: Set by developers, applies to ALL documents
- **Field-level** (when enabled): Set by editors, applies per document

## Best Practices

### Simple Content
```typescript
// Content that's always fully translated
autoTranslate({
  collections: {
    'blog-posts': true,
    'news': true,
  },
  enableExclusions: false, // Keep it simple
  excludeFields: ['slug'], // Just exclude slugs globally
})
```

### Complex Content
```typescript
// Marketing/landing pages need customization
autoTranslate({
  collections: {
    'landing-pages': true,
    'product-pages': true,
  },
  enableExclusions: true, // Enable field-level control
  excludeFields: ['slug'], // But still exclude some fields globally
})
```

### Mixed Setup
```typescript
// Different collections have different needs
autoTranslate({
  collections: {
    // Simple blog - no field controls needed
    posts: true,
    
    // Marketing pages - need field controls
    pages: true,
  },
  enableExclusions: true, // Enable for the pages that need it
  // Note: You can't disable per-collection, it's all or nothing
})
```

## Troubleshooting

### "I disabled exclusions but still see translation controls"

**Cause**: You have `autoInjectUI: true` (default) AND `enableExclusions: true`

**Fix**: Make sure `enableExclusions: false`:
```typescript
autoTranslate({
  enableExclusions: false, // ← Must be false
  autoInjectUI: true, // ← This is ignored when exclusions are disabled
})
```

### "I want to disable exclusions for some collections only"

**Not supported**: The `enableExclusions` option is global, not per-collection.

**Workaround**: Keep exclusions enabled but don't document the feature for certain editors, or use custom access control.

### "Exclusions collection still appears after disabling"

**Cause**: Payload cached the config or the database still has the collection.

**Fix**:
1. Restart the dev server
2. If still visible, manually delete from database:
   ```javascript
   // In MongoDB
   db.translation_exclusions.drop()
   ```

## Summary

- `enableExclusions: true` (default) = Full featured with field-level controls
- `enableExclusions: false` = Simple mode with global config-level exclusions only
- Config-level `excludeFields` works regardless of `enableExclusions`
- Choose based on your content complexity and editor needs

