# Performance Optimization Guide

This guide explains the performance optimizations in the Auto-Translate plugin and how to configure them for optimal translation speed.

## Overview

The Auto-Translate plugin includes several optimization strategies that dramatically reduce translation time for large documents, especially those with complex structures like Lexical editor content.

## Optimization Features

### 1. **Smart String Extraction** (Default: Enabled)

Instead of sending the entire document structure to the translation API, the plugin extracts only translatable strings. This reduces payload size by 80-95% for most documents.

**What gets skipped:**
- Empty or whitespace-only text
- Very short strings (< 3 characters by default)
- MongoDB ObjectIDs and other IDs
- URLs and file paths
- Email addresses
- ISO date strings
- Numbers and percentages
- Status values (published, draft, archived, pending)
- Structural metadata in Lexical editor nodes

**Example reduction:**
```
Original JSON: 15,234 bytes
Optimized JSON: 1,847 bytes
Reduction: 87.9%
```

### 2. **String Deduplication** (Default: Enabled)

Identical strings are only translated once and then reused for all instances. This is especially powerful for documents with repeated content.

**Benefits:**
- Up to 50-70% fewer strings to translate for documents with repeated labels/buttons/headings
- Faster translation times
- Lower API costs
- Consistent translations across repeated content

**Example:**
If your document has the same label "Organizer" appearing 5 times, it's only translated once and reused for all 5 instances.

### 3. **Lexical Editor Optimization**

The plugin has special handling for Lexical editor content (rich text fields):

- Only extracts text from `text` nodes
- Preserves all structural metadata (type, format, version, indent, etc.)
- Skips empty paragraphs and whitespace-only nodes
- Maintains the exact document structure

**Before optimization:**
```json
{
  "eventContent": {
    "root": {
      "children": [
        {
          "children": [
            {
              "text": " ",  // ← This gets skipped
              "type": "text",
              "format": 0,
              "version": 1
            }
          ],
          "type": "paragraph",
          "format": "",
          "indent": 0
        }
      ],
      "type": "root"
    }
  }
}
```

**After optimization:**
Only meaningful text like "Welcome to our event" gets sent for translation.

## Configuration

### Basic Configuration

```typescript
import { autoTranslate } from '@pigment/auto-translate'

export default buildConfig({
  plugins: [
    autoTranslate({
      // Enable optimization (default: true)
      optimizeTranslation: true,
      
      // Enable string deduplication (default: true)
      enableDeduplication: true,
      
      // Minimum string length to translate (default: 3)
      minStringLength: 3,
      
      // Show detailed optimization stats (default: false)
      debugging: true,
    }),
  ],
})
```

### Advanced Configuration

#### Adjust Minimum String Length

If you need to translate very short strings (like abbreviations), you can lower the threshold:

```typescript
autoTranslate({
  minStringLength: 2, // Translate strings with 2+ characters
})
```

Or if you want to skip even longer strings that aren't meaningful:

```typescript
autoTranslate({
  minStringLength: 5, // Only translate strings with 5+ characters
})
```

#### Disable Deduplication

If you need different translations for identical strings in different contexts:

```typescript
autoTranslate({
  enableDeduplication: false,
})
```

**Note:** This will increase translation time and costs.

#### Disable All Optimizations

To use the legacy translation approach (sends entire structure):

```typescript
autoTranslate({
  optimizeTranslation: false,
})
```

**Warning:** This can be 10-100x slower for large documents.

## Performance Comparison

### Example: Event Document with Lexical Content

**Document Stats:**
- Original size: 8,423 bytes
- 127 total string instances
- 18 unique strings after deduplication

**Without Optimization:**
- Payload sent: 8,423 bytes
- Strings translated: 127
- Translation time: ~45-60 seconds

**With Optimization (Default):**
- Payload sent: 847 bytes (90% reduction)
- Strings translated: 18 (86% reduction)
- Translation time: ~3-5 seconds

**Speed improvement: 10-15x faster**

## Debugging

Enable debugging to see detailed optimization stats:

```typescript
autoTranslate({
  debugging: true,
})
```

This will log stats like:

```
[Auto-Translate] ✨ Optimization Stats:
  📊 Unique strings to translate: 18
  🔄 Total string instances: 127
  💾 Deduplication savings: 109 strings (85.8%)
  📦 Original JSON size: 8,423 bytes
  📦 Optimized JSON size: 847 bytes
  🎯 Total size reduction: 89.9%
```

## Best Practices

### 1. Keep Optimization Enabled

Unless you have a specific reason not to, always keep optimization enabled:

```typescript
autoTranslate({
  optimizeTranslation: true, // Default, but explicit is good
})
```

### 2. Use Field-Level Exclusions for Non-Translatable Content

Instead of disabling optimization, use field exclusions for IDs, dates, or other non-translatable content:

```typescript
autoTranslate({
  excludeFields: ['slug', 'sku', 'eventDates.dateTime'],
})
```

### 3. Enable Debugging During Development

See what's being translated and optimize your content structure:

```typescript
autoTranslate({
  debugging: process.env.NODE_ENV === 'development',
})
```

### 4. Adjust minStringLength Based on Your Content

For technical documentation with many abbreviations:
```typescript
autoTranslate({
  minStringLength: 2, // Translate "JS", "UI", etc.
})
```

For marketing content with minimal short strings:
```typescript
autoTranslate({
  minStringLength: 4, // Skip most short strings
})
```

## Troubleshooting

### Translations Taking Too Long?

1. **Enable debugging** to see optimization stats
2. **Check your document size** - Very large documents (>50KB) may still take time
3. **Review field exclusions** - Make sure non-translatable fields are excluded
4. **Verify optimization is enabled** - Check `optimizeTranslation: true`

### Some Short Strings Not Being Translated?

The default `minStringLength` is 3. If you need shorter strings translated:

```typescript
autoTranslate({
  minStringLength: 1, // Translate everything (not recommended)
})
```

### Getting Different Translations for Same Text?

This might happen if deduplication is disabled. Enable it:

```typescript
autoTranslate({
  enableDeduplication: true, // Default
})
```

### API Costs Too High?

The optimizations already reduce API costs by 80-95%. To reduce further:

1. **Increase minStringLength** to skip more short strings
2. **Use field exclusions** aggressively
3. **Enable deduplication** (default) to translate unique strings only

## Technical Details

### How String Extraction Works

1. **Traverse document structure** recursively
2. **Identify translatable strings** based on type and content
3. **Skip non-translatable values** (IDs, dates, URLs, etc.)
4. **Extract Lexical text nodes** while preserving structure
5. **Build path map** for reconstruction

### How Deduplication Works

1. **Build deduplication map** during extraction
2. **Track identical strings** by trimmed value
3. **Store all paths** for each unique string
4. **Translate unique strings** only once
5. **Apply translation** to all paths with same value

### Reconstruction Process

1. **Receive translated strings** from API
2. **Build full translation map** including deduplicated paths
3. **Traverse metadata structure** recursively
4. **Replace placeholders** with translated values
5. **Return complete document** with original structure

## Performance Metrics

For a typical document with Lexical editor content:

| Metric | Without Optimization | With Optimization | Improvement |
|--------|---------------------|-------------------|-------------|
| Payload Size | 100% | 10-20% | 80-90% reduction |
| Strings Sent | 100% | 15-40% | 60-85% reduction |
| API Calls | Same | Same | - |
| Translation Time | 30-120s | 3-10s | 5-15x faster |
| API Cost | $X | $0.10-0.20X | 80-90% savings |

## Migration Guide

### Upgrading from Older Versions

The optimization is enabled by default in newer versions. If upgrading:

1. **No code changes required** - Optimizations are automatic
2. **Test thoroughly** - Verify translations are correct
3. **Enable debugging** - Monitor optimization stats
4. **Adjust settings** if needed based on your content

### Opt-Out If Needed

If you experience issues, you can temporarily opt-out:

```typescript
autoTranslate({
  optimizeTranslation: false, // Use legacy approach
})
```

Then report the issue to help us improve the optimization.

## Support

If you experience performance issues or have questions:

1. Enable debugging to see detailed stats
2. Check this guide for configuration options
3. Review your document structure and size
4. Open an issue with debugging output

---

**Last Updated:** November 2025  
**Plugin Version:** 1.0.1+

