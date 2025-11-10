# Auto-Translate Plugin - Usage Guide

## Quick Start

### 1. Install and Configure

```typescript
// payload.config.ts
import { autoTranslate } from 'auto-translate'

export default buildConfig({
  localization: {
    defaultLocale: 'sv',
    locales: ['sv', 'en', 'de'],
  },
  
  plugins: [
    autoTranslate({
      collections: {
        posts: true,
      },
    }),
  ],
})
```

### 2. Set Environment Variables

```bash
# .env
OPENAI_API_KEY=sk-...your-key-here
```

### 3. Start Using

1. **Create content in default language** (e.g., Swedish)
2. **Save** - automatic translation happens
3. **Switch to secondary language** (e.g., English) to review/customize
4. **Lock specific fields** from auto-translation if needed

---

## Real-World Example: Blog Post Workflow

### Scenario
You're managing a multilingual blog with Swedish as the default language and English/German translations.

### Step-by-Step

#### 1. Create a New Post (in Swedish)

```
Locale: SV (default)
Title: "Våra nya produkter"
Content: "Vi är glada att presentera..."
Author: "Anna Andersson"
```

**Save** → Plugin automatically creates:

- **EN version**: "Our new products" / "We are happy to present..."
- **DE version**: "Unsere neuen Produkte" / "Wir freuen uns..."

#### 2. Customize English Translation

Switch to English locale and notice:
- Title is correctly translated ✅
- But you want a more marketing-friendly title

**Actions:**
1. Click **🔒 Translation lock** on the Title field
2. Change title to: "Exciting New Product Launch!"
3. **Save**

#### 3. Update Swedish Original

Later, you update the Swedish version:
- Change title to: "Uppdatering: Våra nya produkter"
- Add more content

**Save** → Plugin translates:
- ✅ **German title** is updated (not locked)
- ❌ **English title** stays "Exciting New Product Launch!" (locked)
- ✅ **All content** is translated to both languages

---

## Common Use Cases

### Use Case 1: SEO Metadata

**Problem**: Auto-translated meta descriptions aren't optimized for SEO.

**Solution**:
```typescript
autoTranslate({
  collections: {
    pages: {
      enabled: true,
      // Exclude SEO fields globally for this collection
      excludeFields: ['seo.metaDescription', 'seo.keywords'],
    },
  },
})
```

Or manually lock each field in the UI for specific pages.

### Use Case 2: Author Names

**Problem**: Author names shouldn't be translated.

**Solution**:
```typescript
autoTranslate({
  // Global exclusion across all collections
  excludeFields: ['author', 'authorName'],
  
  collections: {
    posts: true,
  },
})
```

### Use Case 3: Custom Product Descriptions

**Problem**: Product descriptions need localization, not just translation.

**Workflow**:
1. Create product in default language
2. Let auto-translate create base translations
3. Switch to each language
4. Lock description field
5. Customize with local terminology and cultural references

### Use Case 4: Mixed Content Strategy

**Scenario**: Some pages are fully translated, others are manual.

**Configuration**:
```typescript
autoTranslate({
  collections: {
    // Blog posts: full auto-translation
    posts: true,
    
    // Landing pages: manual only
    landingPages: false,
    
    // Product pages: auto-translate but exclude certain fields
    products: {
      enabled: true,
      excludeFields: ['pricing', 'localFeatures'],
    },
  },
})
```

---

## Field-Level Control Patterns

### Pattern 1: Lock Individual Array Items

```
Content: [
  { title: "Intro", description: "..." },     // Auto-translate
  { title: "Details", description: "..." },   // Lock this item
  { title: "Summary", description: "..." },   // Auto-translate
]
```

**How**: Click 🔒 on the specific array item you want to lock.

### Pattern 2: Lock Entire Blocks

For block fields like page builders:

1. Navigate to secondary language
2. Find the block you want to customize
3. Lock the entire block (or specific fields within)

### Pattern 3: Nested Object Locking

```typescript
seo: {
  title: "Auto-translated",
  metaDescription: "🔒 Locked - custom SEO",
  keywords: "🔒 Locked - local keywords",
}
```

You can lock individual properties within nested objects.

---

## Advanced Configuration Examples

### Example 1: Multi-Tenant Setup

```typescript
autoTranslate({
  collections: {
    posts: true,
  },
  
  // Only auto-translate for certain tenants
  provider: {
    type: 'custom',
    customTranslate: async ({ data, fromLocale, toLocale, payload }) => {
      // Check tenant-specific settings
      const tenant = await payload.findGlobal({ slug: 'tenant' })
      
      if (tenant.enableAutoTranslate) {
        return await yourTranslationService(data, fromLocale, toLocale)
      }
      
      return data // Return unchanged if disabled
    },
  },
})
```

### Example 2: Conditional Field Exclusions

```typescript
autoTranslate({
  collections: {
    posts: {
      enabled: true,
      // Dynamically exclude fields based on post type
      excludeFields: ['slug', 'author'],
    },
  },
  
  provider: {
    type: 'custom',
    customTranslate: async ({ data, collection }) => {
      // Add conditional exclusions based on document data
      if (data.type === 'technical') {
        // Don't translate code examples
        delete data.codeSnippets
      }
      
      return await translate(data)
    },
  },
})
```

### Example 3: Using DeepL Instead of OpenAI

```typescript
import { Deepl } from 'deepl-node'

const translator = new Deepl(process.env.DEEPL_API_KEY)

autoTranslate({
  collections: { posts: true },
  
  provider: {
    type: 'custom',
    customTranslate: async ({ data, fromLocale, toLocale }) => {
      // Serialize data to translate
      const text = JSON.stringify(data)
      
      // Translate with DeepL
      const result = await translator.translateText(
        text,
        fromLocale.toUpperCase(),
        toLocale.toUpperCase()
      )
      
      return JSON.parse(result.text)
    },
  },
})
```

---

## Debugging Tips

### Enable Debug Mode

```typescript
autoTranslate({
  debugging: true,
  collections: { posts: true },
})
```

**What you'll see:**
```
[Auto-Translate Plugin] Configuration:
- Default locale: sv
- All locales: sv, en, de
- Enabled collections: posts

[Auto-Translate Plugin] Processing posts document update: 123
[Auto-Translate Plugin] Translating posts:123 from sv to en
[Auto-Translate Plugin] Excluded paths for en: title, author
[Auto-Translate Plugin] Successfully translated posts:123 to en
```

### Common Issues

**Issue**: Translations aren't happening

**Check**:
1. ✅ `translationSync` checkbox is enabled
2. ✅ Editing from DEFAULT locale (not secondary)
3. ✅ OpenAI API key is set
4. ✅ Collection is enabled in plugin config

**Issue**: Locked fields are being overwritten

**Check**:
1. ✅ Locked the field in the SECONDARY language (not default)
2. ✅ Field path matches exactly (check dev tools/logs)
3. ✅ Saved after locking

**Issue**: Cost is too high

**Solutions**:
1. Use cheaper model: `model: 'gpt-3.5-turbo'`
2. Exclude more fields globally
3. Disable auto-translate on frequently-updated collections
4. Use local/open-source models with custom provider

---

## Performance Considerations

### Translation Speed

- **Small documents** (< 1KB): ~1-2 seconds per locale
- **Medium documents** (1-10KB): ~2-5 seconds per locale
- **Large documents** (> 10KB): ~5-15 seconds per locale

Translations happen **sequentially** for each locale to respect API rate limits.

### Cost Optimization

**Strategies**:
1. **Exclude static fields**: `slug`, `id`, metadata
2. **Use field-level locking**: Lock fields that rarely change
3. **Batch updates**: Make multiple edits before saving
4. **Selective collections**: Only enable for content that needs translation

**Estimated costs** (with GPT-4o):
- Average blog post: ~$0.01-0.05 per translation
- E-commerce product: ~$0.005-0.02 per translation
- Landing page: ~$0.05-0.20 per translation

---

## Best Practices

### ✅ DO

- Lock fields that require localization (cultural adaptation)
- Use descriptive field names (helps translation quality)
- Review auto-translations periodically
- Enable debug mode during development
- Test with a small subset of content first

### ❌ DON'T

- Don't edit secondary languages without locking fields first
- Don't rely on auto-translation for legal/medical content
- Don't forget to set up proper error handling
- Don't enable for collections with sensitive/private data
- Don't translate already-translated content (use locale fallback instead)

---

## Migration Guide

### From Manual Translation

**Before**:
```typescript
// Manual workflow
1. Create post in Swedish
2. Duplicate for English
3. Manually translate each field
4. Duplicate for German
5. Manually translate each field
```

**After with Plugin**:
```typescript
// Automated workflow
1. Create post in Swedish
2. Save
3. (Optional) Review and customize translations
```

### Data Migration

If you have existing translated content:

1. **Keep existing translations**: Plugin won't overwrite existing content on first run
2. **Enable selectively**: Start with new collections
3. **Test thoroughly**: Use debug mode to see what gets translated
4. **Gradual rollout**: Enable collection by collection

---

## API Reference

### Plugin Options

```typescript
type AutoTranslateConfig = {
  collections?: Record<CollectionSlug, boolean | CollectionConfig>
  disabled?: boolean
  debugging?: boolean
  provider?: ProviderConfig
  excludeFields?: string[]
  enableTranslationSyncByDefault?: boolean
  translationExclusionsSlug?: string
}
```

### Translation Service Methods

```typescript
// Get exclusions for a document
const exclusions = await translationService.getExclusions(
  payload,
  'posts',
  documentId,
  'en'
)

// Update exclusions
await translationService.updateExclusions(
  payload,
  'posts',
  documentId,
  'en',
  ['title', 'content.0.description']
)
```

---

## Support & Resources

- **Documentation**: See main [README.md](./README.md)
- **Examples**: Check `/dev` directory for working example
- **Issues**: Report on GitHub
- **Community**: Join Payload Discord

---

**Happy translating! 🌍**

