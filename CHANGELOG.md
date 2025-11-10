# Changelog

All notable changes to the Auto-Translate plugin will be documented in this file.

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

