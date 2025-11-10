# Architecture Documentation

## Overview

The Auto-Translate plugin is built with a modular, extensible architecture inspired by the [payload-ai plugin](https://github.com/ashbuilds/payload-ai). It follows Payload CMS plugin best practices while providing powerful translation capabilities with granular control.

## Core Principles

1. **One-Way Translation**: Default locale → Secondary locales only
2. **Field-Level Control**: Users can lock specific fields from auto-translation
3. **Non-Destructive**: Preserves locked fields when translating
4. **Extensible**: Easy to add custom translation providers
5. **Transparent**: Debug mode shows exactly what's happening

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Payload CMS Config                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Auto-Translate Plugin                     │    │
│  │                                                     │    │
│  │  ┌───────────────┐    ┌───────────────────────┐   │    │
│  │  │ Configuration │───>│  Collection Modifier  │   │    │
│  │  └───────────────┘    └───────────────────────┘   │    │
│  │                                 │                  │    │
│  │                                 v                  │    │
│  │                       ┌─────────────────┐          │    │
│  │                       │  Add Hooks      │          │    │
│  │                       │  Add Fields     │          │    │
│  │                       │  Add Collections│          │    │
│  │                       │  Add Endpoints  │          │    │
│  │                       └─────────────────┘          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

                              │
                              v

┌─────────────────────────────────────────────────────────────┐
│                   Runtime Flow (on save)                     │
│                                                              │
│  User saves document in DEFAULT locale                       │
│         │                                                    │
│         v                                                    │
│  ┌──────────────────┐                                       │
│  │  afterChange Hook│                                       │
│  └──────────────────┘                                       │
│         │                                                    │
│         v                                                    │
│  ┌─────────────────────────────────┐                       │
│  │ Check translationSync enabled?  │                       │
│  └─────────────────────────────────┘                       │
│         │                                                    │
│         v                                                    │
│  ┌─────────────────────────────────┐                       │
│  │  For each secondary locale:     │                       │
│  │                                 │                       │
│  │  1. Get field exclusions        │                       │
│  │  2. Filter excluded paths       │                       │
│  │  3. Call Translation Service    │                       │
│  │  4. Merge with existing data    │                       │
│  │  5. Save translated document    │                       │
│  └─────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── index.ts                              # Main plugin entry point
├── types/
│   └── index.ts                          # TypeScript definitions
├── collections/
│   └── translationExclusions.ts          # Metadata collection config
├── services/
│   └── translationService.ts             # Translation logic
├── utilities/
│   └── fieldHelpers.ts                   # Field traversal & merging
├── components/
│   ├── TranslationControl.tsx            # UI control component
│   └── TranslationControl.css            # Styles
├── endpoints/
│   └── translationExclusionsEndpoint.ts  # API endpoints
└── exports/
    ├── client.ts                         # Client-side exports
    └── rsc.ts                            # Server component exports
```

---

## Component Breakdown

### 1. Plugin Entry Point (`index.ts`)

**Responsibility**: Configure Payload CMS

**Key Actions**:

- Validates localization config
- Adds `translation-exclusions` collection
- Registers API endpoints
- Modifies enabled collections:
  - Adds `translationSync` field
  - Injects `afterChange` hook
- Returns modified config

**Code Flow**:

```typescript
autoTranslate(pluginOptions) → (config) → {
  1. Validate localization exists
  2. Add exclusions collection
  3. Initialize TranslationService
  4. Add API endpoints
  5. For each enabled collection:
     - Add translationSync field
     - Add afterChange hook
  6. Return modified config
}
```

### 2. Translation Service (`services/translationService.ts`)

**Responsibility**: Handle all translation logic

**Key Methods**:

```typescript
class TranslationService {
  // Main translation method
  async translate(options: TranslateOptions): Promise<any>

  // Get exclusions for a document/locale
  async getExclusions(payload, collection, docId, locale): Promise<string[]>

  // Update exclusions
  async updateExclusions(payload, collection, docId, locale, paths): Promise<void>

  // Get config-level exclusions
  getConfigExcludedFields(collection): string[]
}
```

**Translation Flow**:

```
Input: { data, fromLocale, toLocale, excludedPaths }
  ↓
Filter excluded paths from data
  ↓
Call provider (OpenAI or custom)
  ↓
Return translated data
```

### 3. Field Helpers (`utilities/fieldHelpers.ts`)

**Responsibility**: Manipulate nested data structures

**Key Functions**:

```typescript
// Extract all paths from document
extractFieldPaths(data, parentPath): FieldPath[]

// Remove excluded paths
filterExcludedPaths(data, excludedPaths): any

// Merge translations, preserving exclusions
mergeTranslatedData(original, translated, excludedPaths): any

// Check if path is excluded
isPathExcluded(path, excludedPaths): boolean

// Get/set nested values
getValueAtPath(obj, path): any
setValueAtPath(obj, path, value): void
```

**Path Handling**:

```
Simple field:        'title'
Nested field:        'seo.metaDescription'
Array item:          'content.0.title'
Nested array:        'sections.1.items.0.text'
```

### 4. Translation Control UI (`components/TranslationControl.tsx`)

**Responsibility**: Provide field-level UI for locking translations

**Key Features**:

- Only shows on secondary locales
- Only shows when document has ID (not on create)
- Loads exclusion state from API
- Toggles exclusion via API
- Shows visual feedback (🌐 vs 🔒)

**State Flow**:

```
Component Mount
  ↓
Fetch exclusion state from API
  ↓
Display current state (locked or unlocked)
  ↓
User clicks button
  ↓
POST to /api/translation-exclusions/toggle
  ↓
Update local state
  ↓
Show new state
```

### 5. API Endpoints (`endpoints/translationExclusionsEndpoint.ts`)

**Responsibility**: Provide REST API for exclusion management

**Endpoints**:

```typescript
GET /api/translation-exclusions
  Query: { collection, documentId, locale, fieldPath }
  Response: { isExcluded: boolean, excludedPaths: string[] }

POST /api/translation-exclusions/toggle
  Body: { collection, documentId, locale, fieldPath, exclude: boolean }
  Response: { success: true, isExcluded: boolean, excludedPaths: string[] }
```

### 6. Translation Exclusions Collection (`collections/translationExclusions.ts`)

**Responsibility**: Store field-level exclusion metadata

**Schema**:

```typescript
{
  collection: string // e.g., 'posts'
  documentId: string // e.g., '507f1f77bcf86cd799439011'
  locale: string // e.g., 'en'
  excludedPaths: [
    // Array of paths
    { path: 'title' },
    { path: 'content.0.description' },
  ]
}
```

**Indexes**:

- Unique index on `(collection, documentId, locale)`

---

## Data Flow Examples

### Example 1: Creating a New Document

```
1. User creates post in Swedish (default locale)
   POST /api/posts
   locale: 'sv'
   data: { title: 'Hej', content: '...' }

2. afterChange hook fires
   operation: 'create'
   req.locale: 'sv' (default) ✅
   doc.translationSync: true ✅

3. For locale 'en':
   a. Get exclusions → [] (none yet)
   b. Filter data → { title: 'Hej', content: '...' }
   c. Translate via OpenAI
   d. Save: POST /api/posts/:id?locale=en

4. For locale 'de':
   (same process)

Result: Document exists in 3 languages
```

### Example 2: Locking a Field

```
1. User switches to English locale

2. User clicks "🔒 Lock translation" on title field

3. POST /api/translation-exclusions/toggle
   {
     collection: 'posts',
     documentId: '123',
     locale: 'en',
     fieldPath: 'title',
     exclude: true
   }

4. Server creates/updates exclusion record:
   {
     collection: 'posts',
     documentId: '123',
     locale: 'en',
     excludedPaths: [{ path: 'title' }]
   }

Result: Title is now locked in English
```

### Example 3: Updating with Exclusions

```
1. User updates Swedish post
   PATCH /api/posts/123?locale=sv
   data: {
     title: 'Ny titel',      // Changed
     content: 'Ny text'      // Changed
   }

2. afterChange hook fires for 'en':
   a. Get exclusions → ['title'] (locked!)
   b. Filter data → { content: 'Ny text' }
      (title excluded)
   c. Translate only content
   d. Merge:
      - Keep existing English title (locked)
      - Update English content (translated)
   e. Save merged data

Result: English content updated, title unchanged
```

---

## Hook Execution Flow

```
Document Save (default locale)
  ↓
beforeChange hooks (if any)
  ↓
Data validation
  ↓
Save to database
  ↓
afterChange hook (our plugin)
  ↓
┌─────────────────────────────────────┐
│ Auto-Translate afterChange Hook     │
│                                     │
│ 1. Check operation (create/update)  │
│ 2. Check locale (must be default)   │
│ 3. Check _status (skip drafts)      │
│ 4. Check translationSync flag       │
│ 5. For each secondary locale:       │
│    ├─ Get exclusions from DB       │
│    ├─ Filter excluded paths        │
│    ├─ Call translation service     │
│    ├─ Merge with existing data     │
│    └─ Update document              │
│        (with skipAutoTranslate flag)│
└─────────────────────────────────────┘
  ↓
Other afterChange hooks (if any)
  ↓
Response to client
```

**Important**:

- Updates triggered by the plugin include `context.skipAutoTranslate` to prevent infinite loops.
- When using Payload's drafts feature, translations only trigger when documents are **published** (when `_status === 'published'`). This prevents unnecessary translation costs during autosave operations or draft saves.

---

## Drafts and Autosave Behavior

When Payload's drafts feature is enabled with autosave:

```typescript
versions: {
  drafts: {
    autosave: true,
  },
}
```

The plugin intelligently handles document status:

| Document Status         | Translation Triggered? | Reason                                         |
| ----------------------- | ---------------------- | ---------------------------------------------- |
| `draft`                 | ❌ No                  | Prevents unnecessary API calls during autosave |
| `published`             | ✅ Yes                 | Only translate when explicitly publishing      |
| No drafts (direct save) | ✅ Yes                 | Normal translation flow                        |

**Implementation**:

```typescript
// In afterChange hook
if (doc._status && doc._status !== 'published') {
  // Skip translation for drafts
  return doc
}
```

This ensures:

- **Cost efficiency**: No unnecessary translation API calls during autosave
- **Performance**: Faster autosave operations
- **User control**: Translations only happen when ready to publish

---

## Translation Provider System

The plugin uses a provider pattern for flexibility:

```typescript
interface TranslationProvider {
  type: 'openai' | 'custom'
  model?: string
  apiKey?: string
  baseURL?: string
  customTranslate?: (options: TranslateOptions) => Promise<any>
}
```

### Built-in Provider: OpenAI

```typescript
translateWithOpenAI(data, fromLocale, toLocale) {
  1. Serialize data to JSON
  2. Create system prompt with rules
  3. Call OpenAI Chat Completions API
  4. Parse JSON response
  5. Return translated data
}
```

**OpenAI Prompt**:

```
System: You are a professional translator.
        Translate JSON values from {fromLocale} to {toLocale}.
        Rules: ...

User:   { "title": "Hej", "content": "..." }
```
