# Translation Exclusions and Default Locale

## Important: Exclusions Only Work in Secondary Locales

The **translation lock button (🔒/🌐) ONLY appears in secondary locales**, not in the default locale.

### Why?

**Exclusions control what gets translated TO a locale, not FROM a locale.**

- The default locale (e.g., Swedish) is the **source** of translations
- Secondary locales (e.g., English, German) are **targets** of translations
- Locking a field in a target locale means: "Don't overwrite my custom translation"
- Locking a field in the source locale makes no sense - there's nothing to translate FROM

### Example Workflow

#### Setup
- **Default locale**: Swedish (`sv`)
- **Secondary locales**: English (`en`), German (`de`)

#### Scenario: Blog Post Management

1. **In Swedish (default locale):**
   ```
   Title: "Nya produkter"
   Description: "Vi lanserar spännande produkter"
   ```
   - ❌ **No lock buttons visible** - this is the source content
   - ✅ Just edit and publish normally

2. **Switch to English:**
   - Auto-translated to:
     ```
     Title: "New products"  🌐 ← Lock button appears
     Description: "We're launching exciting products"  🌐
     ```
   - You want a better marketing title
   - **Action**: Click 🔒 on Title
   - Edit title to: "Revolutionary New Product Launch!"
   - Now title shows: "Revolutionary New Product Launch!" 🔒

3. **Switch to German:**
   - Auto-translated to:
     ```
     Title: "Neue Produkte"  🌐 ← Lock button appears
     Description: "Wir starten spannende Produkte"  🌐
     ```
   - You want to customize the description
   - **Action**: Click 🔒 on Description
   - Edit description to: "Entdecken Sie unsere revolutionären Produkte"
   - Now description shows: "Entdecken Sie..." 🔒

4. **Update Swedish original:**
   ```
   Title: "Uppdaterade produkter"  ← No lock button, just edit
   Description: "Vi lanserar ännu fler produkter"
   ```
   - Save & Publish
   
5. **What happens:**
   - **English**:
     - Title: Still "Revolutionary New Product Launch!" 🔒 (locked, not overwritten)
     - Description: Updated to "We're launching even more products" 🌐 (not locked, translated)
   - **German**:
     - Title: Updated to "Aktualisierte Produkte" 🌐 (not locked, translated)
     - Description: Still "Entdecken Sie..." 🔒 (locked, not overwritten)

## Visual Guide

### In Default Locale (Swedish)

```
┌─────────────────────────────────────────┐
│ Locale: SV (Svenska) ← Default          │
├─────────────────────────────────────────┤
│ Title                                    │
│ ┌─────────────────────────────────────┐ │
│ │ Nya produkter                       │ │ ← No lock button
│ └─────────────────────────────────────┘ │
│                                          │
│ Description                              │
│ ┌─────────────────────────────────────┐ │
│ │ Vi lanserar spännande produkter    │ │ ← No lock button
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

This is the SOURCE content. Just edit normally.
Lock buttons don't make sense here.
```

### In Secondary Locale (English)

```
┌─────────────────────────────────────────┐
│ Locale: EN (English) ← Secondary        │
├─────────────────────────────────────────┤
│ Title                   🔒 Translation   │ ← Lock button appears!
│ ┌─────────────────────────────────────┐ │
│ │ Revolutionary New Product Launch!  │ │
│ └─────────────────────────────────────┘ │
│ This field is locked and won't be       │
│ overwritten from default language       │
│                                          │
│ Description                 🌐 Auto     │ ← Unlocked
│ ┌─────────────────────────────────────┐ │
│ │ We're launching exciting products  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

You can lock/unlock fields to control
which ones get auto-translated.
```

## Technical Details

### Component Behavior

```typescript
// TranslationControl.tsx
export const TranslationControl: React.FC<TranslationControlProps> = ({
  defaultLocale,  // e.g., "sv"
  fieldPath,
}) => {
  const { code: currentLocale } = useLocale()  // e.g., "en"
  
  // KEY CHECK: Don't show in default locale
  if (currentLocale === defaultLocale) {
    return null  // Component doesn't render
  }
  
  // ... rest of component only runs in secondary locales
}
```

### Translation Logic

```typescript
// During translation (index.ts)
// This runs when editing in DEFAULT locale (sv)
collection.hooks.afterChange.push(async ({ doc, req }) => {
  // Only run when editing in default locale
  if (req.locale !== defaultLocale) {
    return doc  // Skip if editing secondary locale
  }
  
  // Translate to each SECONDARY locale
  for (const targetLocale of secondaryLocales) {  // en, de, etc.
    // Get exclusions for TARGET locale
    const excludedPaths = await getExclusions(
      collection,
      doc.id,
      targetLocale  // ← Query for "en" or "de", NOT "sv"
    )
    
    // Translate, but skip excluded fields
    // ...
  }
})
```

## Common Questions

### Q: Why can't I see the lock button in my default language?

**A:** That's correct! The lock button only appears in secondary languages because:
- You can only "lock" translations, not source content
- The default locale IS the source, so there's nothing to lock

### Q: What if I want to prevent a field from being translated to ALL secondary locales?

**A:** Use the global or collection-level `excludeFields` configuration:

```typescript
autoTranslate({
  collections: {
    posts: {
      enabled: true,
      excludeFields: ['slug', 'authorBio'],  // Never translate these
    },
  },
})
```

This is different from per-locale field locking:
- **Global exclusion**: Field is never translated to any locale
- **Per-locale lock**: Field is translated to some locales but locked in others

### Q: Can I exclude a field in Swedish and have it NOT translate to English?

**A:** Not with field-level locking. Use collection-level `excludeFields` instead:

```typescript
collections: {
  posts: {
    enabled: true,
    excludeFields: ['technicalSpecifications'],  // Won't translate to any locale
  },
}
```

### Q: I accidentally locked fields in the default locale before this update. What happens?

**A:** Those exclusion records exist in the database but have no effect:
- They're stored with `locale: "sv"`
- Translation queries for `locale: "en"`, `locale: "de"`, etc.
- So they're never used

You can safely delete them from the `translation-exclusions` collection if you want to clean up.

## Summary Table

| Scenario | Lock Button Visible? | Effect |
|----------|---------------------|--------|
| Viewing default locale (SV) | ❌ No | N/A - this is the source content |
| Viewing secondary locale (EN) | ✅ Yes | Controls if field gets overwritten from SV |
| Lock field in EN | ✅ Yes | Field won't be overwritten when SV changes |
| Lock field in DE | ✅ Yes | Independent from EN - only affects DE translations |
| Edit field in SV | ❌ No lock | Just edit normally - changes trigger translation |

## Best Practices

1. **Edit source content in default locale freely**
   - No need to worry about locks
   - Changes automatically trigger translations

2. **Review translations in secondary locales**
   - Check auto-translated content
   - Lock fields where you want custom translations

3. **Lock strategically**
   - Marketing content: Lock for better messaging
   - Technical terms: Usually fine to auto-translate
   - SEO metadata: Often worth locking and customizing

4. **Use global exclusions for consistency**
   - Fields that should NEVER translate: Use `excludeFields`
   - Fields you might customize per-locale: Use lock button

## Debugging

If you think you're seeing lock buttons in the default locale:

1. Check console logs:
   ```javascript
   [TranslationControl] Component rendering
   Current locale: sv
   Default locale: sv
   Should render: false  // ← Should be false for default locale
   ```

2. Verify your config:
   ```typescript
   localization: {
     defaultLocale: 'sv',  // ← Check this matches
     locales: ['sv', 'en', 'de'],
   }
   ```

3. Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)

If issues persist, please report with:
- Your `defaultLocale` config
- Current locale when you see the issue
- Console logs



