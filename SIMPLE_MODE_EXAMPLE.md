# Simple Mode Example (Exclusions Disabled)

## Use Case: Simple Blog

You have a blog where all content should always be fully translated without any customization per locale.

## Configuration

```typescript
import { autoTranslate } from '@pigment/auto-translate'
import { buildConfig } from 'payload'

export default buildConfig({
  localization: {
    defaultLocale: 'sv',
    locales: ['sv', 'en', 'de', 'fr'],
  },
  
  collections: [
    {
      slug: 'posts',
      fields: [
        {
          name: 'title',
          type: 'text',
          localized: true,
          required: true,
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          // Not localized - same slug for all languages
        },
        {
          name: 'excerpt',
          type: 'textarea',
          localized: true,
        },
        {
          name: 'content',
          type: 'richText',
          localized: true,
          required: true,
        },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          // Not localized - same author for all languages
        },
        {
          name: 'publishedAt',
          type: 'date',
          // Not localized - same date for all languages
        },
      ],
    },
  ],
  
  plugins: [
    autoTranslate({
      collections: {
        posts: true,
      },
      
      // ⭐ Disable field-level exclusions for simplicity
      enableExclusions: false,
      
      // Global exclusions still work (exclude these from translation)
      excludeFields: ['slug', 'author', 'publishedAt'],
      
      // OpenAI settings
      provider: {
        type: 'openai',
        model: 'gpt-4o',
      },
    }),
  ],
})
```

## What You Get

### ✅ What Works

1. **Automatic Translation**
   - Create a post in Swedish
   - Save → Automatically translated to English, German, French
   - All localized fields are translated

2. **Global Field Exclusions**
   - `slug`, `author`, `publishedAt` are never translated
   - Set in config, not per-document

3. **Translation Sync Toggle**
   - Each post still has "Enable Auto-Translation" checkbox
   - Can disable auto-translation for specific posts if needed

4. **Simple Admin UI**
   - No extra translation control buttons cluttering the interface
   - Just edit and save

### ❌ What's Removed

1. **No Translation Exclusions Collection**
   - Collection list doesn't have "Translation Exclusions"
   - Cleaner admin interface

2. **No Field-Level Controls**
   - No 🌐/🔒 buttons on fields
   - Simpler UI for editors

3. **No Per-Document Field Locking**
   - Can't lock specific fields per post
   - All-or-nothing per post (via Translation Sync toggle)

## Workflow Example

### Creating Content

1. **In Payload Admin:**
   - Go to Posts → Create New
   - Make sure locale is set to **Swedish (SV)**

2. **Fill in content:**
   ```
   Title: "Introduktion till Payload CMS"
   Excerpt: "Lär dig grunderna i Payload CMS"
   Content: "Payload CMS är ett kraftfullt..."
   Slug: "intro-to-payload" (not localized)
   ```

3. **Save & Publish**
   - Plugin automatically translates to EN, DE, FR
   - Wait a few seconds for translation to complete

4. **View in English:**
   - Switch locale to **English (EN)**
   - See translated content:
     ```
     Title: "Introduction to Payload CMS"
     Excerpt: "Learn the basics of Payload CMS"
     Content: "Payload CMS is a powerful..."
     Slug: "intro-to-payload" (same as Swedish)
     ```

### Updating Content

1. **Edit in Swedish:**
   - Update the title or content
   - Save & Publish

2. **Automatic Re-translation:**
   - All secondary locales are updated
   - No manual work needed
   - No risk of missing translations

### Disabling Translation for a Specific Post

If you need to stop auto-translation for one post:

1. **In the post sidebar:**
   - Uncheck **"Enable Auto-Translation"**
   - Save

2. **Result:**
   - This post won't be auto-translated anymore
   - You can manually edit each locale
   - Other posts still auto-translate normally

## When to Use Simple Mode

### ✅ Good For

- **News/Blog Posts** - Content that's straightforward to translate
- **Documentation** - Technical docs that don't need localization
- **Product Catalogs** - Descriptions that are the same across markets
- **Internal Content** - Company wikis, intranets
- **Simple Websites** - Where content is universal

### ❌ Not Good For

- **Marketing Pages** - Need locale-specific messaging
- **Landing Pages** - Headlines/CTAs need customization
- **Legal Content** - Terms/policies need careful adaptation
- **E-commerce with Regional Pricing** - Prices differ by locale
- **SEO-Heavy Sites** - Meta tags need per-locale optimization

## Comparison: Simple vs Full Mode

### Simple Mode (`enableExclusions: false`)

```typescript
autoTranslate({
  collections: { posts: true },
  enableExclusions: false,
})
```

**Pros:**
- ✅ Simpler admin UI
- ✅ Faster (no exclusion queries)
- ✅ Easier to understand for editors
- ✅ Less database overhead
- ✅ Fewer API endpoints

**Cons:**
- ❌ Can't customize per-field per-locale
- ❌ All-or-nothing approach
- ❌ Less flexibility

### Full Mode (`enableExclusions: true` - default)

```typescript
autoTranslate({
  collections: { posts: true },
  enableExclusions: true, // or omit (default)
})
```

**Pros:**
- ✅ Granular control per field
- ✅ Lock specific fields from translation
- ✅ Mix auto + manual translation
- ✅ Perfect for marketing content

**Cons:**
- ❌ More complex UI
- ❌ Slight performance overhead
- ❌ More training needed for editors
- ❌ More collections/endpoints

## Migration Between Modes

### From Full Mode → Simple Mode

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

**What happens:**
- Translation exclusions collection disappears
- 🌐/🔒 buttons disappear
- All fields now auto-translate
- Existing exclusion records ignored (but remain in DB)

### From Simple Mode → Full Mode

```typescript
// Before
autoTranslate({
  collections: { posts: true },
  enableExclusions: false,
})

// After
autoTranslate({
  collections: { posts: true },
  enableExclusions: true, // ← Enable
})
```

**What happens:**
- Translation exclusions collection appears
- 🌐/🔒 buttons appear on fields
- Users can now lock fields
- No exclusions set by default (all unlocked)

## Example: News Website

Perfect use case for simple mode:

```typescript
autoTranslate({
  collections: {
    articles: true,
    categories: true,
    authors: true,
  },
  
  // Simple mode - no field-level controls
  enableExclusions: false,
  
  // But still exclude these globally
  excludeFields: [
    'slug',
    'publishedAt',
    'author',
  ],
  
  // Fast and cheap model for news
  provider: {
    type: 'openai',
    model: 'gpt-4o-mini',
  },
})
```

## Tips for Simple Mode

### 1. Use Translation Sync Toggle

Even without field-level controls, you can control translation per-document:

- **Enable** (default) → Auto-translate
- **Disable** → Manual translation

### 2. Leverage Global Exclusions

Set `excludeFields` carefully:

```typescript
excludeFields: [
  'slug',           // URLs should match
  'author',         // Names don't translate
  'publishedAt',    // Dates are universal
  'featuredImage',  // Asset IDs don't translate
]
```

### 3. Content Guidelines

Create guidelines for editors:

> "All content will be automatically translated. Write in clear, simple Swedish that translates well. Avoid idioms, slang, or cultural references."

### 4. Review Workflow

Even with auto-translation, have a review process:

1. **Swedish Editor** creates content
2. **Auto-translate** to all languages
3. **Native speakers** review (but can't lock fields, only edit)
4. Future Swedish updates → Re-translate everything

## Summary

Simple mode (`enableExclusions: false`) is perfect for:
- ✅ Straightforward content
- ✅ Universal messaging
- ✅ Simpler workflows
- ✅ Less editor training needed

Full mode (`enableExclusions: true`) is better for:
- ✅ Marketing content
- ✅ Locale-specific messaging
- ✅ SEO optimization
- ✅ Legal/compliance content

Choose based on your content type and team needs! 🚀

