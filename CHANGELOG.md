# Changelog

All notable changes to the Auto-Translate plugin will be documented in this file.

## [1.1.0] - 2025-11-10

### ⚡ Performance Improvements

- **Major translation speed optimization**: 10-15x faster for large documents
  - Smart string extraction: Only sends translatable content to API (80-95% size reduction)
  - String deduplication: Identical strings translated once and reused
  - Enhanced Lexical editor support: Skips empty paragraphs and whitespace-only nodes
  - Configurable minimum string length threshold
  
- **New configuration options**:
  - `minStringLength` (default: 3): Minimum characters to translate
  - `enableDeduplication` (default: true): Toggle string deduplication
  - Improved debugging output with detailed optimization stats

- **Performance metrics**:
  - Example event document: 8,423 bytes → 847 bytes (89.9% reduction)
  - Translation strings: 127 instances → 18 unique (85.8% reduction)
  - Translation time: 45-60s → 3-5s (10-15x faster)

### ✨ Improvements

- Enhanced `shouldSkipString` logic:
  - Better whitespace detection (skips single spaces)
  - Configurable minimum string length
  - Improved short string handling
  
- Lexical editor optimizations:
  - Automatically skips whitespace-only text nodes
  - Preserves document structure while extracting only translatable text
  - Special handling for empty paragraphs
  
- Better debugging:
  - Visual optimization stats with emojis (📊, 🔄, 💾, 📦, 🎯)
  - Shows unique vs total string counts
  - Displays deduplication savings percentage
  - Reports size reduction metrics

### 📚 Documentation

- **New: PERFORMANCE_OPTIMIZATION.md** - Comprehensive performance guide
  - Detailed explanation of optimization features
  - Configuration examples and best practices
  - Troubleshooting guide
  - Performance comparison tables
  - Migration guide for upgrading

- Updated README with performance section
- Added performance feature to feature list

### 🐛 Bug Fixes

- Fixed potential issue with deduplication map not being used correctly
- Improved reconstruction logic to handle deduplicated translations

---

## [1.0.1] - 2025-11-07

### 🐛 Bug Fixes

- **Fixed autosave triggering translations**: Translations now only trigger when explicitly publishing documents, not during autosave operations
  - Added `_status` check to skip draft saves
  - Prevents unnecessary API calls and costs during autosave
  - Only translates when `doc._status === 'published'` or when drafts are disabled

- **Fixed TranslationControl showing in default locale**: Lock button now only appears in secondary locales
  - Added check to hide component when `currentLocale === defaultLocale`
  - Exclusions in default locale had no effect on translations anyway
  - Makes the UI clearer - you can only lock translations in target locales
  - Pass `defaultLocale` prop to TranslationControl component

### ✨ Improvements

- **Enhanced TranslationControl component with detailed logging**:
  - Added console logs to help debug exclusion behavior
  - Added locale verification checks when loading/saving exclusions
  - Improved error messages and warnings for locale mismatches
  - Better visibility into what exclusions are being loaded/saved per locale

- **Improved translation-exclusions collection UI**:
  - Added clear description emphasizing per-locale nature
  - Made collection/documentId/locale fields visible in sidebar
  - Added "group: Settings" for better organization
  - Added helpful field descriptions
  - Improved default columns in list view

### 📚 Documentation

- Updated README with note about drafts/autosave behavior
- Added "Drafts and Autosave Behavior" section to ARCHITECTURE.md
- Updated translation flow diagram to include status check
- **New: PER_LOCALE_EXCLUSIONS.md** - Comprehensive guide to per-locale exclusion system
  - Explains how exclusions are stored independently per locale
  - Debugging guide with console log examples
  - Troubleshooting common issues
  - Test scripts to verify per-locale behavior
- **New: DEFAULT_LOCALE_EXCLUSIONS.md** - Explains why lock buttons only appear in secondary locales
  - Visual guide showing UI differences between default and secondary locales
  - Technical explanation of translation flow
  - Common questions and best practices
  - Clarifies that exclusions control TARGET locales, not source

---

## [1.0.0] - 2025-11-05

### 🎉 Initial Release

#### ✨ Features

- **One-Way Auto-Translation**: Automatically translate content from default locale to all secondary locales on save
- **Field-Level Exclusion Controls**: Lock specific fields from auto-translation with UI toggles
- **Smart Translation Merging**: Preserves locked fields when updating default language content
- **OpenAI Integration**: Built-in support for GPT-4o and other OpenAI models
- **Custom Provider Support**: Extensible architecture for custom translation services
- **Flexible Configuration**: Per-collection settings, global exclusions, and debugging options
- **Metadata Collection**: Tracks field-level exclusions per document/locale
- **RESTful API**: Endpoints for managing translation exclusions
- **TypeScript**: Full type safety and IntelliSense support
- **Debug Mode**: Detailed logging for development and troubleshooting

#### 🏗️ Architecture

- Modular, extensible design inspired by payload-ai plugin
- Clean separation of concerns:
  - `services/translationService.ts` - Translation logic
  - `utilities/fieldHelpers.ts` - Data manipulation helpers
  - `collections/translationExclusions.ts` - Metadata storage
  - `components/TranslationControl.tsx` - UI components
  - `endpoints/translationExclusionsEndpoint.ts` - API endpoints

#### 📚 Documentation

- **README.md**: Main documentation with features and configuration
- **QUICKSTART.md**: 5-minute setup guide
- **USAGE_GUIDE.md**: Detailed usage examples and workflows
- **INTEGRATION_EXAMPLES.md**: Real-world code examples
- **ARCHITECTURE.md**: Technical architecture documentation
- **SUMMARY.md**: Quick overview and implementation checklist

#### 🎨 UI Components

- **Translation Control Button**: Per-field lock/unlock toggle
- **Translation Sync Toggle**: Document-level enable/disable switch
- **Visual Indicators**: 🌐 (auto-translate) and 🔒 (locked) icons

#### 🔧 Configuration Options

```typescript
{
  collections: Record<CollectionSlug, boolean | CollectionConfig>
  disabled?: boolean
  debugging?: boolean
  provider?: {
    type: 'openai' | 'custom'
    model?: string
    apiKey?: string
    baseURL?: string
    customTranslate?: Function
  }
  excludeFields?: string[]
  enableTranslationSyncByDefault?: boolean
  translationExclusionsSlug?: string
}
```

#### 🚀 Supported Features

- ✅ Simple fields (text, textarea, etc.)
- ✅ Rich text fields (Lexical)
- ✅ Nested objects and groups
- ✅ Arrays and array fields
- ✅ Blocks
- ✅ Tabs
- ✅ Deep nesting support
- ✅ Relationship fields (excluded by default)
- ✅ Upload fields (excluded by default)

#### 🔒 Security

- Respects Payload's built-in access control
- Translation operations run with user's permissions
- API endpoints honor collection access rules
- No sensitive data logging (unless debug mode)

#### 📦 Package

- Published as `@pigment/auto-translate`
- Requires Payload CMS 3.37.0+
- Peer dependency on OpenAI SDK
- Full ESM support

---

## Roadmap

### Upcoming Features

- [ ] Batch translation API for bulk operations
- [ ] Translation history tracking
- [ ] Translation quality scoring
- [ ] Support for more translation providers (DeepL, Google Translate)
- [ ] Translation review workflow
- [ ] Cost tracking and analytics
- [ ] Scheduled translations
- [ ] Translation cache layer
- [ ] Webhook support for translation events
- [ ] Multi-tenancy support enhancements

### Under Consideration

- Bidirectional translation (with conflict resolution)
- Real-time translation preview
- Translation memory/glossary
- A/B testing for translations
- SEO optimization suggestions
- Translation analytics dashboard

---

## Migration Guides

### From Manual Translation

If you're currently manually translating content:

1. **Backup your database**
2. **Install the plugin** with collections disabled
3. **Test with a single collection** first
4. **Gradually enable** more collections
5. **Train your team** on the lock/unlock workflow

The plugin won't overwrite existing translations on first run.

### From Other Translation Plugins

Contact support for migration assistance.

---

## Breaking Changes

None (initial release)

---

## Known Issues

### Version 1.0.0

1. **Large documents (>100KB)**: May hit OpenAI token limits
   - **Workaround**: Use field exclusions to reduce payload size

2. **Rate limiting**: No built-in rate limiting for OpenAI
   - **Workaround**: Use custom provider with rate limiting logic

3. **Concurrent edits**: Simultaneous edits in different locales may conflict
   - **Workaround**: Use field locking and proper workflow

4. **Rich text formatting**: Some complex formatting may not translate perfectly
   - **Workaround**: Review and adjust translations manually

---

## Support

- **Issues**: https://github.com/yourusername/auto-translate/issues
- **Discussions**: https://github.com/yourusername/auto-translate/discussions
- **Discord**: Join Payload CMS Discord

---

## Contributors

- [@ritesh](https://github.com/ritesh) - Initial implementation

---

## License

MIT License - see [LICENSE.md](./LICENSE.md) for details

---

## Acknowledgments

- Inspired by [@ashbuilds/payload-ai](https://github.com/ashbuilds/payload-ai)
- Built with [Payload CMS](https://payloadcms.com)
- Powered by [OpenAI](https://openai.com)

