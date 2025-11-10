import type { CollectionSlug, Payload } from 'payload'

export type AutoTranslateConfig = {
  /**
   * List of collections to enable auto-translation
   */
  collections?: Partial<Record<CollectionSlug, boolean | CollectionTranslateConfig>>

  /**
   * Disable the plugin entirely
   */
  disabled?: boolean

  /**
   * Show debug logs
   */
  debugging?: boolean

  /**
   * Translation provider settings
   */
  provider?: {
    type: 'openai' | 'custom'
    model?: string
    apiKey?: string
    baseURL?: string
    customTranslate?: (options: TranslateOptions) => Promise<any>
  }

  /**
   * Fields to exclude from translation globally
   */
  excludeFields?: string[]

  /**
   * Enable translation sync by default
   */
  enableTranslationSyncByDefault?: boolean

  /**
   * Collection slug for storing translation exclusions metadata
   */
  translationExclusionsSlug?: string

  /**
   * Auto-inject translation control UI into all localized fields (default: true)
   */
  autoInjectUI?: boolean
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
  data: any
  fromLocale: string
  toLocale: string
  excludedPaths?: string[]
  payload: Payload
  collection: CollectionSlug
}

export type TranslationExclusion = {
  id?: string
  collection: CollectionSlug
  documentId: string
  locale: string
  excludedPaths: string[] // Field paths like 'title', 'content.0.description'
  createdAt?: string
  updatedAt?: string
}

export type FieldPath = {
  path: string
  value: any
  parentPath?: string
}

