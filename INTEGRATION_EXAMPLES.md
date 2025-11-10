# Integration Examples

## Adding Translation Control UI to Custom Components

If you want to add the translation control button to custom field components, here's how to do it:

### Example 1: Basic Field with Translation Control

```typescript
// src/fields/CustomTextField.tsx
'use client'

import React from 'react'
import { TextField } from '@payloadcms/ui'
import { TranslationControl } from 'auto-translate/client'

export const CustomTextField: React.FC<any> = (props) => {
  const { path } = props

  return (
    <div>
      <TextField {...props} />
      
      {/* Add translation control if field is localized */}
      {props.localized && (
        <TranslationControl
          fieldPath={path}
          collectionSlug={props.collectionSlug}
        />
      )}
    </div>
  )
}
```

### Example 2: Rich Text Field with Control

```typescript
// Collection configuration
{
  name: 'content',
  type: 'richText',
  localized: true,
  admin: {
    components: {
      afterInput: [
        {
          path: 'auto-translate/client#TranslationControl',
          clientProps: {
            fieldPath: 'content',
          },
        },
      ],
    },
  },
}
```

### Example 3: Array Field with Controls

```typescript
{
  name: 'sections',
  type: 'array',
  localized: true,
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      // Add control for each array item's title
      admin: {
        components: {
          afterInput: [{
            path: 'auto-translate/client#TranslationControl',
          }],
        },
      },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      admin: {
        components: {
          afterInput: [{
            path: 'auto-translate/client#TranslationControl',
          }],
        },
      },
    },
  ],
}
```

---

## Real-World Collection Examples

### Example 1: Blog Posts

```typescript
// collections/Posts.ts
import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      admin: {
        position: 'sidebar',
      },
      // Don't translate slugs
      localized: false,
    },
    {
      name: 'excerpt',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      localized: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      // Don't translate author
      localized: false,
    },
    {
      name: 'publishedDate',
      type: 'date',
      // Don't translate dates
      localized: false,
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      // Categories should be the same across languages
      localized: false,
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
          localized: true,
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
        },
        {
          name: 'keywords',
          type: 'text',
          localized: true,
        },
      ],
    },
  ],
}
```

**Plugin Config**:
```typescript
autoTranslate({
  collections: {
    posts: {
      enabled: true,
      // Optionally exclude SEO fields from auto-translation
      // so editors can write custom SEO for each language
      excludeFields: ['seo.title', 'seo.description', 'seo.keywords'],
    },
  },
})
```

### Example 2: E-Commerce Products

```typescript
// collections/Products.ts
import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'sku',
      type: 'text',
      required: true,
      // SKU is universal
      localized: false,
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      // Prices might differ by locale
      localized: true,
    },
    {
      name: 'specifications',
      type: 'array',
      localized: true,
      fields: [
        {
          name: 'label',
          type: 'text',
          localized: true,
        },
        {
          name: 'value',
          type: 'text',
          localized: true,
        },
      ],
    },
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'alt',
          type: 'text',
          localized: true,
        },
      ],
    },
    {
      name: 'features',
      type: 'array',
      localized: true,
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'icon',
          type: 'text',
        },
      ],
    },
  ],
}
```

**Plugin Config**:
```typescript
autoTranslate({
  collections: {
    products: {
      enabled: true,
      // Don't auto-translate prices - they might need adjustment
      excludeFields: ['price'],
    },
  },
})
```

### Example 3: Landing Pages with Page Builder

```typescript
// collections/Pages.ts
import type { CollectionConfig } from 'payload'

export const Pages: CollectionConfig = {
  slug: 'pages',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      localized: false,
    },
    {
      name: 'layout',
      type: 'blocks',
      localized: true,
      blocks: [
        {
          slug: 'hero',
          fields: [
            {
              name: 'heading',
              type: 'text',
              localized: true,
            },
            {
              name: 'subheading',
              type: 'textarea',
              localized: true,
            },
            {
              name: 'ctaText',
              type: 'text',
              localized: true,
            },
            {
              name: 'ctaLink',
              type: 'text',
              // Internal links should be managed per locale
              localized: true,
            },
            {
              name: 'backgroundImage',
              type: 'upload',
              relationTo: 'media',
              localized: false,
            },
          ],
        },
        {
          slug: 'content',
          fields: [
            {
              name: 'heading',
              type: 'text',
              localized: true,
            },
            {
              name: 'content',
              type: 'richText',
              localized: true,
            },
          ],
        },
        {
          slug: 'cta',
          fields: [
            {
              name: 'text',
              type: 'text',
              localized: true,
            },
            {
              name: 'link',
              type: 'text',
              localized: true,
            },
          ],
        },
      ],
    },
    {
      name: 'meta',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
          localized: true,
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          localized: false,
        },
      ],
    },
  ],
}
```

**Plugin Config**:
```typescript
autoTranslate({
  collections: {
    pages: {
      enabled: true,
      // Exclude meta fields - SEO should be hand-crafted
      excludeFields: ['meta.title', 'meta.description'],
    },
  },
  
  debugging: true,
})
```

---

## Advanced Custom Provider Examples

### Example 1: Using Google Cloud Translation

```typescript
import { v2 } from '@google-cloud/translate'

const translator = new v2.Translate({
  projectId: process.env.GOOGLE_PROJECT_ID,
  key: process.env.GOOGLE_API_KEY,
})

autoTranslate({
  collections: { posts: true },
  
  provider: {
    type: 'custom',
    customTranslate: async ({ data, fromLocale, toLocale }) => {
      // Helper to translate recursively
      const translateObject = async (obj: any): Promise<any> => {
        if (typeof obj === 'string') {
          const [translation] = await translator.translate(obj, {
            from: fromLocale,
            to: toLocale,
          })
          return translation
        }
        
        if (Array.isArray(obj)) {
          return Promise.all(obj.map(translateObject))
        }
        
        if (obj && typeof obj === 'object') {
          const translated: any = {}
          for (const [key, value] of Object.entries(obj)) {
            translated[key] = await translateObject(value)
          }
          return translated
        }
        
        return obj
      }
      
      return await translateObject(data)
    },
  },
})
```

### Example 2: Using DeepL with Caching

```typescript
import { Translator } from 'deepl-node'
import { Redis } from 'ioredis'

const deepl = new Translator(process.env.DEEPL_API_KEY)
const redis = new Redis(process.env.REDIS_URL)

autoTranslate({
  collections: { posts: true },
  
  provider: {
    type: 'custom',
    customTranslate: async ({ data, fromLocale, toLocale }) => {
      const cacheKey = `translation:${fromLocale}:${toLocale}:${JSON.stringify(data)}`
      
      // Check cache first
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
      
      // Translate with DeepL
      const text = JSON.stringify(data)
      const result = await deepl.translateText(
        text,
        fromLocale,
        toLocale
      )
      
      const translated = JSON.parse(result.text)
      
      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(translated))
      
      return translated
    },
  },
})
```

### Example 3: Hybrid Translation (AI + Human Review)

```typescript
autoTranslate({
  collections: {
    posts: {
      enabled: true,
    },
  },
  
  provider: {
    type: 'custom',
    customTranslate: async ({ data, fromLocale, toLocale, payload, collection }) => {
      // 1. Auto-translate with AI
      const autoTranslated = await aiTranslate(data, fromLocale, toLocale)
      
      // 2. Create a review task
      await payload.create({
        collection: 'translation-reviews',
        data: {
          originalLocale: fromLocale,
          targetLocale: toLocale,
          collectionSlug: collection,
          originalContent: data,
          autoTranslation: autoTranslated,
          status: 'pending-review',
        },
      })
      
      // 3. Return auto-translation (will be reviewed later)
      return autoTranslated
    },
  },
})
```

### Example 4: Fallback Translation Strategy

```typescript
autoTranslate({
  collections: { posts: true },
  
  provider: {
    type: 'custom',
    customTranslate: async ({ data, fromLocale, toLocale, payload }) => {
      try {
        // Try premium provider first (DeepL)
        return await translateWithDeepL(data, fromLocale, toLocale)
      } catch (error) {
        payload.logger.warn('DeepL failed, falling back to Google Translate')
        
        try {
          // Fallback to Google Translate
          return await translateWithGoogle(data, fromLocale, toLocale)
        } catch (error) {
          payload.logger.warn('Google Translate failed, falling back to OpenAI')
          
          // Final fallback to OpenAI
          return await translateWithOpenAI(data, fromLocale, toLocale)
        }
      }
    },
  },
})
```

---

## Hooks Integration

### Pre-Translation Hook

```typescript
// Add custom logic before translation
collection.hooks.beforeChange = [
  async ({ data, req, operation }) => {
    if (operation === 'update' && req.locale === defaultLocale) {
      // Log translation events
      await req.payload.create({
        collection: 'translation-logs',
        data: {
          documentId: data.id,
          collection: 'posts',
          timestamp: new Date(),
          user: req.user.id,
        },
      })
    }
    
    return data
  },
]
```

### Post-Translation Hook

```typescript
// Add custom logic after translation
collection.hooks.afterChange = [
  async ({ doc, req, operation, previousDoc }) => {
    // Check if translation quality
    if (operation === 'update' && req.locale !== defaultLocale) {
      // Send notification about new translation
      await sendTranslationNotification({
        document: doc,
        locale: req.locale,
      })
    }
    
    return doc
  },
]
```

---

## Testing Examples

### Integration Test Example

```typescript
// dev/int.spec.ts
import { describe, it, expect, beforeAll } from 'vitest'

describe('Auto-Translate Plugin', () => {
  let payload: any

  beforeAll(async () => {
    payload = await getPayload({ config: await configPromise })
  })

  it('should auto-translate on create', async () => {
    // Create post in default locale (sv)
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'Hej världen',
        description: {
          root: {
            children: [
              {
                children: [{ text: 'Detta är ett test' }],
                type: 'paragraph',
              },
            ],
          },
        },
        translationSync: true,
      },
      locale: 'sv',
    })

    // Fetch English version
    const englishPost = await payload.findByID({
      collection: 'posts',
      id: post.id,
      locale: 'en',
      fallbackLocale: false,
    })

    expect(englishPost.title).toBeTruthy()
    expect(englishPost.title).not.toBe('Hej världen')
    // Should be translated to something like "Hello world"
  })

  it('should respect field exclusions', async () => {
    // Create post
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'Test inlägg',
        translationSync: true,
      },
      locale: 'sv',
    })

    // Add exclusion for title in English
    await payload.create({
      collection: 'translation-exclusions',
      data: {
        collection: 'posts',
        documentId: post.id,
        locale: 'en',
        excludedPaths: [{ path: 'title' }],
      },
    })

    // Update Swedish post
    await payload.update({
      collection: 'posts',
      id: post.id,
      data: {
        title: 'Uppdaterad titel',
      },
      locale: 'sv',
    })

    // English title should NOT be updated
    const englishPost = await payload.findByID({
      collection: 'posts',
      id: post.id,
      locale: 'en',
      fallbackLocale: false,
    })

    expect(englishPost.title).toBe(/* original translation, not updated */)
  })
})
```

---

## Troubleshooting Common Issues

### Issue: "Cannot read property 'locales' of undefined"

**Solution**: Make sure localization config exists in payload.config.ts:

```typescript
export default buildConfig({
  localization: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
  },
  // ...
})
```

### Issue: Translations not appearing

**Check**:
1. Is `translationSync` enabled on the document?
2. Are you editing from the **default** locale?
3. Is the collection enabled in plugin config?
4. Check server logs for errors

### Issue: OpenAI rate limits

**Solution**:
```typescript
provider: {
  type: 'custom',
  customTranslate: async ({ data, ...rest }) => {
    // Add delay between translations
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return await translateWithOpenAI(data, rest)
  },
}
```

---

**Need more examples? Check the [Usage Guide](./USAGE_GUIDE.md) or open an issue!**

