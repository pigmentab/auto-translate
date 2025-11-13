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
   * Enable field-level translation exclusions (default: true)
   * When disabled:
   * - Translation exclusions collection is hidden
   * - Translation control buttons are not added to fields
   * - All localized fields are always translated
   */
  enableExclusions?: boolean

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
    type: 'custom' | 'openai'
  }

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
  collection: CollectionSlug
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
