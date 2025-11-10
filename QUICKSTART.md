# Quick Start Guide

Get up and running with the Auto-Translate plugin in 5 minutes!

## Prerequisites

- Node.js 18+ or 20+
- A Payload CMS project
- OpenAI API key (get one at https://platform.openai.com/api-keys)

---

## Step 1: Install Dependencies

```bash
pnpm install
# or
npm install
```

---

## Step 2: Set Up Environment Variables

Create a `.env` file in your `dev` directory (or project root):

```bash
# Database (use your own MongoDB or Postgres)
DATABASE_URI=mongodb://localhost:27017/auto-translate

# Payload secret (generate a random string)
PAYLOAD_SECRET=your-super-secret-key-here

# OpenAI API key (REQUIRED for translation)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

> **Get your OpenAI API key**: https://platform.openai.com/api-keys

---

## Step 3: Configure Localization

Make sure your `payload.config.ts` has localization configured:

```typescript
// dev/payload.config.ts or your-project/payload.config.ts
export default buildConfig({
  localization: {
    defaultLocale: 'sv',  // Your default language
    locales: ['sv', 'en'], // All supported languages
    fallback: true,
  },
  
  // ... rest of config
})
```

---

## Step 4: Add the Plugin

```typescript
import { autoTranslate } from 'auto-translate'

export default buildConfig({
  // ... localization config from above
  
  plugins: [
    autoTranslate({
      collections: {
        posts: true, // Enable for 'posts' collection
      },
      debugging: true, // See what's happening
    }),
  ],
})
```

---

## Step 5: Ensure Collections Have Localized Fields

```typescript
// Your collection config (e.g., collections/Posts.ts)
{
  slug: 'posts',
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true, // ← Must be localized to translate
      required: true,
    },
    {
      name: 'content',
      type: 'richText',
      localized: true, // ← Must be localized to translate
    },
  ],
}
```

---

## Step 6: Start the Dev Server

```bash
pnpm dev
# or
npm run dev
```

Navigate to: http://localhost:3000/admin

---

## Step 7: Test the Plugin!

### Create Your First Auto-Translated Post

1. **Log in** to the admin panel
2. **Go to Posts** collection
3. **Create a new post** with:
   - Title: "Välkommen till vår blogg" (Swedish)
   - Content: "Detta är en test" (Swedish)
   - Make sure the locale switcher shows **SV** (or your default locale)
4. **Click Save**

### Check the Translation

1. **Switch locale** to **EN** (or your secondary locale) using the locale switcher
2. **View the same post** - you should see it translated!
   - Title: "Welcome to our blog" (English)
   - Content: "This is a test" (English)

### Lock a Field from Translation

1. While in the **secondary locale** (e.g., EN):
2. Find a field you want to customize
3. Look for the **translation control button** near the field
4. **Click the 🌐 button** to lock it (it will change to 🔒)
5. **Edit the field** with your custom translation
6. **Save**

7. Now **switch back to default locale** (SV)
8. **Change that same field**
9. **Save**

10. **Switch back to secondary locale** (EN)
11. **Notice**: Your locked field wasn't overwritten! ✅

---

## Common Issues & Solutions

### Issue: "Translations not happening"

**Solutions**:
1. Check `OPENAI_API_KEY` is set correctly
2. Make sure you're editing from the **default locale** (check locale switcher)
3. Verify `translationSync` checkbox is enabled (in document sidebar)
4. Check server logs for errors

### Issue: "Field is not translating"

**Solutions**:
1. Make sure the field has `localized: true` in its config
2. Check if the field is in the `excludeFields` config
3. Verify the field is not locked in the secondary locale

### Issue: "OpenAI API rate limit"

**Solution**: Add a delay or use a custom provider with rate limiting:

```typescript
autoTranslate({
  collections: { posts: true },
  provider: {
    type: 'openai',
    model: 'gpt-3.5-turbo', // Use cheaper/faster model
  },
})
```

### Issue: "Cost is too high"

**Solutions**:
1. Use a cheaper model: `'gpt-3.5-turbo'`
2. Exclude more fields:
   ```typescript
   excludeFields: ['slug', 'author', 'tags']
   ```
3. Disable auto-translate on less important collections
4. Use field-level locking for stable content

---

## Next Steps

### 1. Configure for Production

Remove `debugging` and optimize settings:

```typescript
autoTranslate({
  collections: {
    posts: true,
    pages: true,
  },
  
  debugging: false, // Disable debug logs in production
  
  provider: {
    type: 'openai',
    model: 'gpt-4o', // Best quality
  },
  
  excludeFields: [
    'slug',
    'author',
    'publishedDate',
  ],
  
  enableTranslationSyncByDefault: true,
})
```

### 2. Read Full Documentation

- **[README.md](./README.md)** - Complete feature list and configuration
- **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** - Real-world examples and workflows
- **[INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md)** - Code examples

### 3. Customize for Your Needs

- Add more collections
- Configure field exclusions
- Try a custom translation provider
- Add UI components to custom fields

### 4. Deploy

The plugin works the same in production:

1. Set `OPENAI_API_KEY` in production environment
2. Deploy as normal
3. Translations happen automatically on save

---

## Example: Blog Workflow

```
1. Writer creates post in Swedish (default)
   ├─ Title: "Våra nya produkter"
   ├─ Content: "Vi är glada att presentera..."
   └─ Save

2. Plugin auto-translates to English
   ├─ Title: "Our new products"
   ├─ Content: "We are happy to present..."
   └─ Saved automatically

3. Editor reviews English version
   ├─ Switches to EN locale
   ├─ Sees auto-translation
   └─ Looks good? Done! ✅

4. Or, editor customizes specific fields
   ├─ Locks title field (🔒)
   ├─ Changes to: "Exciting New Product Launch!"
   └─ Save

5. Writer updates Swedish post
   ├─ Changes title to: "Uppdatering: Våra nya produkter"
   └─ Save

6. Plugin intelligently updates English
   ├─ Title: Still "Exciting New Product Launch!" (locked)
   ├─ Content: Updated with new translation ✅
   └─ Perfect! 🎉
```

---

## Tips for Best Results

### ✅ DO

- **Start small**: Enable for one collection first
- **Use debug mode**: See exactly what's happening
- **Review translations**: AI is good but not perfect
- **Lock important fields**: SEO, marketing copy, etc.
- **Test thoroughly**: Before going to production

### ❌ DON'T

- **Don't translate legal content**: Without human review
- **Don't forget API costs**: Monitor your OpenAI usage
- **Don't edit secondary locales**: Without locking first (unless you want it overwritten)
- **Don't skip testing**: Try all your field types

---

## Help & Support

- **Questions?** Check [README.md](./README.md)
- **Issues?** Check server logs with `debugging: true`
- **Bugs?** Open an issue on GitHub
- **Need examples?** See [INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md)

---

## That's It! 🎉

You're now ready to auto-translate your content. Happy translating! 🌍

**Pro tip**: Use the debug mode to understand what's happening under the hood:

```typescript
debugging: true // See detailed logs
```

Then check your server console to see:
- Which fields are being translated
- Which fields are excluded
- Translation success/failure
- API calls and responses

