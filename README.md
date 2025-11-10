# Payload CMS Auto-Translate Plugin

A powerful auto-translation plugin for [Payload CMS](https://payloadcms.com) that automatically translates content from your default language to secondary languages with field-level translation control.

## ✨ Features

- 🌍 **One-Way Auto-Translation**: Automatically translates content from default language to secondary languages
- 🔒 **Field-Level Exclusion**: Toggle "do not translate" on specific fields in secondary languages
- 🎯 **Smart Translation**: Preserves excluded fields when updating default language content
- 🔧 **Flexible Configuration**: Configure per-collection settings and global exclusions
- 🤖 **OpenAI Integration**: Uses GPT-4o for high-quality translations (with custom provider support)
- 📦 **Zero UI Overhead**: Seamlessly integrates with Payload's admin panel

## 📋 How It Works

1. Create or edit a post in your **default language** (e.g., Swedish)
2. Save the document - it automatically translates to all secondary languages (e.g., English)
3. Switch to a secondary language and mark specific fields as "translation locked" 🔒
4. Future updates to those fields in the default language won't overwrite your custom translations

## 🚀 Installation

```bash
npm install auto-translate
# or
pnpm add auto-translate
# or
yarn add auto-translate
```

## ⚙️ Configuration

### Basic Setup

```typescript
import { autoTranslate } from 'auto-translate'
import { buildConfig } from 'payload'

export default buildConfig({
  // Your localization config is required
  localization: {
    defaultLocale: 'sv',
    locales: ['sv', 'en', 'de', 'fr'],
    fallback: true,
  },
  
  collections: [
    // Your collections...
  ],
  
  plugins: [
    autoTranslate({
      collections: {
        posts: true,
        pages: true,
      },
    }),
  ],
})
```

### Environment Variables

Create a `.env` file in your project root:

```bash
# Required for OpenAI translation
OPENAI_API_KEY=your-openai-api-key

# Optional: Custom OpenAI endpoint
OPENAI_BASE_URL=https://api.openai.com/v1
```

> **⚠️ Important:** Restart your server after updating `.env` or plugin settings.

---

## 🔧 Advanced Configuration

### Full Configuration Options

```typescript
import { autoTranslate } from 'auto-translate'

export default buildConfig({
  plugins: [
    autoTranslate({
      // Enable auto-translate for specific collections
      collections: {
        posts: true,
        pages: {
          enabled: true,
          // Exclude specific fields from translation in this collection
          excludeFields: ['slug', 'author'],
        },
      },

      // Optional: Show debug logs
      debugging: false,

      // Optional: Translation provider settings
      provider: {
        type: 'openai', // or 'custom'
        model: 'gpt-4o', // OpenAI model to use
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL,
        
        // Optional: Custom translation function
        customTranslate: async ({ data, fromLocale, toLocale }) => {
          // Your custom translation logic
          return translatedData
        },
      },

      // Optional: Global field exclusions (across all collections)
      excludeFields: ['slug', 'id', 'createdAt', 'updatedAt'],

      // Optional: Enable translation sync by default
      enableTranslationSyncByDefault: true,

      // Optional: Custom collection slug for metadata
      translationExclusionsSlug: 'translation-exclusions',
    }),
  ],
})
```

### Per-Collection Configuration

You can configure translation behavior per collection:

```typescript
collections: {
  // Simple enable
  posts: true,
  
  // Disable translation
  drafts: false,
  
  // Advanced configuration
  pages: {
    enabled: true,
    excludeFields: ['slug', 'author', 'seo.keywords'],
  },
}
```

### Custom Translation Provider

If you don't want to use OpenAI, you can provide your own translation function:

```typescript
provider: {
  type: 'custom',
  customTranslate: async ({ data, fromLocale, toLocale, payload, collection }) => {
    // Use Google Translate, DeepL, or any other service
    const translated = await yourTranslationService.translate(data, {
      from: fromLocale,
      to: toLocale,
    })
    
    return translated
  },
}
```

---

## 📚 Usage Guide

### 1. Creating Content

1. Create a new document in your **default language**
2. Fill in all the fields with content
3. Save the document
4. ✨ The plugin automatically translates and saves the content in all secondary languages

### 2. Locking Fields from Translation

Sometimes you want to customize translations in secondary languages without them being overwritten:

1. Switch to a **secondary language** (e.g., English)
2. Find the field you want to customize
3. Click the **🔒 Translation lock** button (or **🌐 Auto-translate** to unlock)
4. Edit the field with your custom translation
5. Save the document

Now when you update that field in the default language, it won't overwrite your custom translation in the secondary language!

### 3. Managing Translation Sync

Each document has a **"Enable Auto-Translation"** checkbox in the sidebar:

- ✅ **Enabled** (default): Changes in default language automatically translate
- ❌ **Disabled**: No automatic translation occurs

### 4. Field-Level Control

The plugin tracks field exclusions per document, per locale, per field path. This means you can:

- Lock translation for `title` in English but keep it unlocked in German
- Lock a specific block item (e.g., `content.0.description`) in one language
- Lock nested fields like `seo.meta.description`

---

## 🏗️ How Translation Works

### Translation Flow

```
1. User edits document in DEFAULT language (e.g., Swedish)
   ↓
2. User saves/publishes document
   ↓
3. Plugin checks if translationSync is enabled
   ↓
4. Plugin checks if document is published (skips drafts/autosaves)
   ↓
5. For each SECONDARY language (e.g., English, German):
   a. Fetch field-level exclusions for that language
   b. Remove excluded fields from translation payload
   c. Translate remaining fields using OpenAI
   d. Merge translated data with existing, preserving excluded fields
   e. Save translated document in that language
```

> **📝 Note**: When using Payload's drafts feature with autosave enabled, translations only trigger when you explicitly **publish** the document, not during autosave operations. This prevents unnecessary translation costs and API calls.

### Field Exclusion Logic

- **Global exclusions**: Applied to all collections (configured in plugin options)
- **Collection exclusions**: Applied to specific collections (configured per collection)
- **Field-level exclusions**: Set by users via UI (stored in `translation-exclusions` collection)
- **Auto-excluded**: `id`, `_id`, `createdAt`, `updatedAt`, `translationSync`, `__v`

### Nested Field Support

The plugin fully supports nested and complex field structures:

- **Objects**: `meta.description` ✅
- **Arrays**: `content.0.title` ✅
- **Blocks**: `layout.0.heading` ✅
- **Rich Text**: Translates rich text content ✅

---

## 🎨 UI Components

The plugin adds minimal UI elements to your admin panel:

### Translation Sync Toggle
- **Location**: Document sidebar
- **Purpose**: Enable/disable auto-translation for the entire document

### Translation Control Button (per field)
- **Location**: Near each translatable field (in secondary languages only)
- **Purpose**: Lock/unlock translation for specific fields
- **States**:
  - 🌐 **Auto-translate**: Field will be updated from default language
  - 🔒 **Translation locked**: Field won't be overwritten from default language

---

## 🔍 Debugging

Enable debugging to see detailed logs:

```typescript
autoTranslate({
  debugging: true,
  // ... other options
})
```

This will log:
- Configuration on startup
- Translation triggers
- Excluded paths for each translation
- Translation success/failure messages
- API calls and responses

---

## 📊 Architecture

The plugin is built with a clean, modular architecture inspired by [payload-ai](https://github.com/ashbuilds/payload-ai):

```
src/
├── index.ts                    # Main plugin entry point
├── types/                      # TypeScript type definitions
├── collections/                # Translation metadata collection
├── services/                   # Translation service layer
│   └── translationService.ts   # Handles translation logic
├── utilities/                  # Helper functions
│   └── fieldHelpers.ts         # Field traversal & merging
├── components/                 # UI components
│   └── TranslationControl.tsx  # Field-level control button
└── endpoints/                  # Custom API endpoints
    └── translationExclusionsEndpoint.ts
```

---

## 🧪 Testing

Run the test suite:

```bash
pnpm test              # Run all tests
pnpm test:int          # Run integration tests
pnpm test:e2e          # Run end-to-end tests
```

---

## 🔒 Access Control

The plugin respects Payload's access control. Translation operations run with the same permissions as the user making the update.

If you need custom access control for translation features, you can add hooks or modify the endpoints.

---

## 🚧 Limitations

- **One-way translation only**: Default language → Secondary languages (not vice versa)
- **No real-time translation**: Translation happens on save, not as you type
- **OpenAI dependency**: Requires OpenAI API key (unless using custom provider)
- **Cost considerations**: Each translation uses OpenAI API credits

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📝 License

MIT

---

## 🙏 Acknowledgments

Inspired by the excellent [payload-ai plugin](https://github.com/ashbuilds/payload-ai) by [@ashbuilds](https://github.com/ashbuilds).

---

## 📞 Support

If you have questions or need help:

1. Check the [Payload CMS documentation](https://payloadcms.com/docs)
2. Open an issue on GitHub
3. Join the [Payload Discord](https://discord.gg/payload)

---

**Made with ❤️ for the Payload CMS community**
