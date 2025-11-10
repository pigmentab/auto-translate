# Drafts & Autosave Translation Fix

## Issue
When Payload CMS drafts with autosave were enabled, the auto-translate plugin was triggering translations on every autosave operation. This caused:
- Unnecessary API calls to OpenAI
- Increased costs
- Performance overhead
- Translations running before content was ready to publish

## Solution
Added a status check in the `afterChange` hook to only trigger translations when documents are **explicitly published**, not during draft saves or autosaves.

## Changes Made

### 1. Core Logic Update (`src/index.ts`)

Added status check before translation:

```typescript
// Skip translation for drafts when autosave is enabled
// Only translate when document is published
if (doc._status && doc._status !== 'published') {
  if (pluginOptions.debugging) {
    req.payload.logger.info(
      `[Auto-Translate Plugin] Skipping translation - document is a draft (status: ${doc._status})`,
    )
  }
  return doc
}
```

### 2. Documentation Updates

#### README.md
- Added note in translation flow about publish-only behavior
- Clarified that autosaves don't trigger translations

#### ARCHITECTURE.md
- Added new section "Drafts and Autosave Behavior"
- Updated hook execution flow diagram
- Added table explaining translation behavior for different document statuses

#### CHANGELOG.md
- Created version 1.0.1 entry
- Documented the bug fix
- Listed documentation updates

### 3. Version Bump
- Updated `package.json` version from 1.0.0 to 1.0.1

## Behavior

| Document Status | Translation Triggered? | When This Happens |
|----------------|------------------------|-------------------|
| `draft` | ❌ No | Autosave operations, manual draft saves |
| `published` | ✅ Yes | Clicking "Save & Publish" or "Publish" button |
| No drafts enabled | ✅ Yes | Normal save operations (no draft feature) |

## Testing

To test this fix:

1. **Start the dev server:**
   ```bash
   pnpm dev
   ```

2. **Create/edit a post in default locale (Swedish):**
   - Make changes to a post
   - Notice that autosave runs automatically
   - Check that translations are NOT triggered (check console logs with debugging enabled)

3. **Publish the document:**
   - Click "Save & Publish" or "Publish Changes"
   - Check that translations ARE triggered now
   - Verify translations appear in secondary locales (English, German)

4. **Enable debugging** to see detailed logs:
   ```typescript
   autoTranslate({
     debugging: true,
     // ... other config
   })
   ```

Expected debug output:
- For autosaves: `"Skipping translation - document is a draft (status: draft)"`
- For publish: `"Processing posts document update: [id]"` followed by translation logs

## Benefits

- ✅ **Cost Savings**: No unnecessary API calls during autosave
- ✅ **Performance**: Faster autosave operations
- ✅ **User Control**: Translations only happen when explicitly publishing
- ✅ **Better UX**: Users can work on drafts without triggering translations
- ✅ **Backward Compatible**: Works with collections that don't have drafts enabled

## Edge Cases Handled

1. **Collections without drafts**: Normal behavior (translations on every save)
2. **Collections with drafts**: Translations only on publish
3. **Mixed collections**: Each collection behaves according to its config
4. **Debugging mode**: Clear log messages for both draft and publish scenarios

## Implementation Notes

- The `_status` field is automatically added by Payload when drafts are enabled
- Status values: `'draft'`, `'published'`
- If `_status` doesn't exist (no drafts), the check passes through (translations run)
- The check happens early in the hook to minimize overhead

## Related Configuration

Example collection with drafts:

```typescript
{
  slug: 'posts',
  fields: [
    // ... your fields
  ],
  versions: {
    drafts: {
      autosave: true, // Autosave won't trigger translations
    },
  },
}
```

## Future Enhancements

Potential improvements for future versions:
- Configuration option to allow translation on draft saves (if desired)
- Manual "translate now" button for draft documents
- Batch translation endpoint for multiple drafts at once

