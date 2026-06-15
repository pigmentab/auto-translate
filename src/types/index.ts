import type { CollectionSlug, Payload } from 'payload'

export type AutoTranslateConfig = {
  /**
   * Auto-inject translation control UI into all localized fields (default: true)
   * Note: This is ignored if enableExclusions is false
   */
  autoInjectUI?: boolean

  /**
   * List of collections to enable auto-translation
   */
  collections?: Partial<Record<CollectionSlug, boolean | CollectionTranslateConfig>>

  /**
   * Show debug logs
   */
  debugging?: boolean

  /**
   * Disable the plugin entirely
   */
  disabled?: boolean

  /**
   * Enable deduplication of identical strings (default: true)
   * When enabled, identical strings are only translated once and reused
   * This significantly speeds up translation for documents with repeated content
   */
  enableDeduplication?: boolean

  /**
   * Enable field-level translation exclusions (default: true)
   * When disabled:
   * - Translation exclusions collection is hidden
   * - Translation control buttons are not added to fields
   * - All localized fields are always translated
   */
  enableExclusions?: boolean

  /**
   * Enable translation sync by default
   */
  enableTranslationSyncByDefault?: boolean

  /**
   * Fields to exclude from translation globally
   */
  excludeFields?: string[]

  /**
   * Minimum string length to translate (default: 3)
   * Strings shorter than this (after trimming) will be skipped
   * This helps avoid translating single characters, dashes, spaces, etc.
   */
  minStringLength?: number

  /**
   * Enable compatibility with @payloadcms/plugin-nested-docs (default: true).
   *
   * When truthy, auto-translate will:
   * 1. Exclude the nested-docs-managed fields (`parent` and `breadcrumbs`) from
   *    the AI translation payload so they are never mistranslated.
   * 2. Add a beforeChange hook that strips `id` from breadcrumb array items on
   *    non-default-locale writes, preventing the "Value must be unique: id"
   *    Postgres constraint error caused by nested-docs' resaveChildren hook
   *    reusing the default-locale breadcrumb ids in secondary locales.
   *
   * Set to `false` to disable (if you're not using nested-docs).
   * Pass an object to override the default field slugs used by nested-docs.
   */
  nestedDocs?:
    | boolean
    | {
        /** Slug of the breadcrumbs array field (default: 'breadcrumbs') */
        breadcrumbsFieldSlug?: string
        /** Slug of the parent relationship field (default: 'parent') */
        parentFieldSlug?: string
      }

  /**
   * Use optimized translation that extracts only translatable strings (default: true)
   * This dramatically reduces API payload size and improves translation speed for large documents
   */
  optimizeTranslation?: boolean

  /**
   * Translation provider settings
   */
  provider?: {
    apiKey?: string
    baseURL?: string
    customTranslate?: (options: TranslateOptions) => Promise<any>
    model?: string
    /**
     * Timeout for translation requests in milliseconds (default: 30000)
     */
    timeout?: number
    type: 'custom' | 'openai'
  }

  /**
   * Only translate fields that have localization enabled (default: false).
   *
   * When enabled, a field is translated only if it is `localized: true` — either
   * directly, or by inheriting localization from an ancestor container that is
   * localized (`group`, `array`, `blocks`, or a named `tab`). Every non-localized
   * field keeps its source value and is excluded from translation.
   *
   * This reflects Payload's data model: only localized fields store per-locale
   * values, so translating a non-localized field would overwrite the single
   * shared value across all locales.
   */
  translateLocalizedFieldsOnly?: boolean

  /**
   * Collection slug for storing translation exclusions metadata
   */
  translationExclusionsSlug?: string

  /**
   * Global slug for translation settings UI
   */
  translationSettingsSlug?: string
}

export type CollectionTranslateConfig = {
  /**
   * Enable translation for this collection
   */
  enabled?: boolean

  /**
   * Fields to exclude from translation for this specific collection
   */
  excludeFields?: string[]
}

export type TranslateOptions = {
  collection: CollectionSlug
  data: any
  excludedPaths?: string[]
  fromLocale: string
  payload: Payload
  toLocale: string
}

export type TranslationExclusion = {
  collectionSlug: CollectionSlug
  createdAt?: string
  documentId: string
  excludedPaths: string[] // Field paths like 'title', 'content.0.description'
  id?: string
  locale: string
  updatedAt?: string
}

export type FieldPath = {
  parentPath?: string
  path: string
  value: any
}
