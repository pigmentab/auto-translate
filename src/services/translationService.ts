import type { Payload } from 'payload'

import OpenAI from 'openai'

import type { AutoTranslateConfig, TranslateOptions } from '../types/index.js'

import { filterExcludedPaths } from '../utilities/fieldHelpers.js'

export class TranslationService {
  private client?: OpenAI
  private config: AutoTranslateConfig

  constructor(config: AutoTranslateConfig) {
    this.config = config
  }

  /**
   * Extracts translatable text from lexical editor nodes
   */
  private extractFromLexicalNode(
    node: any,
    path: string,
    strings: Map<string, string>,
    deduplicationMap: Map<string, string[]>,
  ): any {
    const enableDeduplication = this.config.enableDeduplication !== false // Default to true

    // Handle text nodes - skip whitespace-only or very short text
    if (node.type === 'text' && node.text && typeof node.text === 'string') {
      const trimmed = node.text.trim()

      // Skip if empty, whitespace-only, or too short
      if (trimmed.length === 0 || this.shouldSkipString(node.text, `${path}.text`)) {
        return node
      }

      const textPath = `${path}.text`

      if (enableDeduplication) {
        // Check for deduplication
        if (deduplicationMap.has(trimmed)) {
          // This string already exists, just store the path mapping
          const existingPaths = deduplicationMap.get(trimmed)!
          existingPaths.push(textPath)
          return { ...node, text: `__TRANSLATE_${textPath}__` }
        } else {
          // New unique string
          strings.set(textPath, node.text)
          deduplicationMap.set(trimmed, [textPath])
          return { ...node, text: `__TRANSLATE_${textPath}__` }
        }
      } else {
        // No deduplication - add every string
        strings.set(textPath, node.text)
        deduplicationMap.set(trimmed, [textPath])
        return { ...node, text: `__TRANSLATE_${textPath}__` }
      }
    }

    // Handle nodes with children
    if (node.children && Array.isArray(node.children)) {
      return {
        ...node,
        children: node.children.map((child: any, index: number) =>
          this.extractFromLexicalNode(
            child,
            `${path}.children[${index}]`,
            strings,
            deduplicationMap,
          ),
        ),
      }
    }

    return node
  }

  /**
   * Extracts translatable strings from data structure
   * Returns a map of paths to translatable values and metadata for reconstruction
   */
  private extractTranslatableStrings(
    data: any,
    path: string = '',
  ): { deduplicationMap: Map<string, string[]>; metadata: any; strings: Map<string, string> } {
    const strings = new Map<string, string>()
    const deduplicationMap = new Map<string, string[]>() // value -> [paths]
    const enableDeduplication = this.config.enableDeduplication !== false // Default to true

    const extract = (obj: any, currentPath: string): any => {
      if (obj === null || obj === undefined) {
        return obj
      }

      // Handle lexical editor format
      if (this.isLexicalEditorNode(obj)) {
        return this.extractFromLexicalNode(obj, currentPath, strings, deduplicationMap)
      }

      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map((item, index) => extract(item, `${currentPath}[${index}]`))
      }

      // Handle objects
      if (typeof obj === 'object') {
        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
          const newPath = currentPath ? `${currentPath}.${key}` : key
          result[key] = extract(value, newPath)
        }
        return result
      }

      // Handle strings
      if (typeof obj === 'string' && obj.trim().length > 0) {
        // Skip IDs and other non-translatable strings
        if (!this.shouldSkipString(obj, currentPath)) {
          if (enableDeduplication) {
            // Check for deduplication
            const trimmedValue = obj.trim()
            if (deduplicationMap.has(trimmedValue)) {
              // This string already exists, just store the path mapping
              const existingPaths = deduplicationMap.get(trimmedValue)!
              existingPaths.push(currentPath)
              return `__TRANSLATE_${currentPath}__`
            } else {
              // New unique string
              strings.set(currentPath, obj)
              deduplicationMap.set(trimmedValue, [currentPath])
              return `__TRANSLATE_${currentPath}__`
            }
          } else {
            // No deduplication - add every string
            strings.set(currentPath, obj)
            deduplicationMap.set(obj.trim(), [currentPath])
            return `__TRANSLATE_${currentPath}__`
          }
        }
      }

      return obj
    }

    const metadata = extract(data, path)
    return { deduplicationMap, metadata, strings }
  }

  /**
   * Lazily initialize OpenAI client only when needed
   */
  private getOpenAIClient(): OpenAI {
    if (!this.client) {
      const apiKey = this.config.provider?.apiKey || process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error(
          'OpenAI API key is required. Set OPENAI_API_KEY environment variable or provide it in plugin config.',
        )
      }

      this.client = new OpenAI({
        apiKey,
        baseURL: this.config.provider?.baseURL || process.env.OPENAI_BASE_URL,
      })
    }
    return this.client
  }

  /**
   * Gets the original value at a path in metadata (helper for deduplication)
   */
  private getOriginalValue(metadata: any, path: string): null | string {
    try {
      const parts = path.split(/[.[\]]/).filter(Boolean)
      let current = metadata
      for (const part of parts) {
        if (current === null || current === undefined) {
          return null
        }
        current = current[part]
      }
      return typeof current === 'string' ? current : null
    } catch {
      return null
    }
  }

  /**
   * Gets translation settings from the global or returns defaults
   */
  private async getTranslationSettings(payload: Payload): Promise<{
    maxTokens?: number
    model: string
    systemPrompt: string
    temperature: number
    translationRules: string
  }> {
    const settingsSlug = this.config.translationSettingsSlug || 'translation-settings'

    // Default values
    const defaults = {
      maxTokens: undefined,
      model: this.config.provider?.model || 'gpt-4o',
      systemPrompt:
        'You are a professional translator. Translate the JSON object values from {fromLocale} to {toLocale}.',
      temperature: 0.3,
      translationRules: `Rules:
        - Only translate the values, never the keys
        - Preserve the exact JSON structure
        - Maintain formatting, HTML tags, and special characters
        - Return only valid JSON without any markdown formatting or code blocks
        - If a value is already in the target language or is a proper noun, keep it as is`,
    }

    try {
      const settings = await payload.findGlobal({
        slug: settingsSlug,
      })

      if (settings) {
        return {
          maxTokens: settings.maxTokens || defaults.maxTokens,
          model: settings.model || defaults.model,
          systemPrompt: settings.systemPrompt || defaults.systemPrompt,
          temperature:
            typeof settings.temperature === 'number' ? settings.temperature : defaults.temperature,
          translationRules: settings.translationRules || defaults.translationRules,
        }
      }
    } catch (error) {
      if (this.config.debugging) {
        console.warn(
          '[Auto-Translate] Could not fetch translation settings, using defaults:',
          error,
        )
      }
    }

    return defaults
  }

  /**
   * Checks if an object is a lexical editor node
   */
  private isLexicalEditorNode(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      'type' in obj &&
      'version' in obj &&
      ('children' in obj || 'text' in obj)
    )
  }

  /**
   * Reconstructs data with translated strings, applying deduplicated translations
   */
  private reconstructWithTranslations(
    metadata: any,
    translations: Map<string, string>,
    deduplicationMap: Map<string, string[]>,
  ): any {
    // Build a comprehensive translation map including deduplicated paths
    const fullTranslations = new Map<string, string>()

    // For each unique string that was translated
    translations.forEach((translatedValue, originalPath) => {
      fullTranslations.set(originalPath, translatedValue)

      // Find all paths that had the same original value
      const originalValue = this.getOriginalValue(metadata, originalPath)
      if (originalValue) {
        const trimmed = originalValue.replace(/^__TRANSLATE_(.+)__$/, '$1')
        // Look through deduplication map to find all paths with same value
        for (const [value, paths] of deduplicationMap.entries()) {
          if (paths.includes(originalPath)) {
            // Apply the same translation to all paths with this value
            paths.forEach((path) => {
              fullTranslations.set(path, translatedValue)
            })
            break
          }
        }
      }
    })

    const reconstruct = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return obj
      }

      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map((item) => reconstruct(item))
      }

      // Handle objects
      if (typeof obj === 'object') {
        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
          result[key] = reconstruct(value)
        }
        return result
      }

      // Replace translation placeholders
      if (typeof obj === 'string' && obj.startsWith('__TRANSLATE_')) {
        const path = obj.slice(12, -2) // Remove __TRANSLATE_ prefix and __ suffix
        return fullTranslations.get(path) || obj
      }

      return obj
    }

    return reconstruct(metadata)
  }

  /**
   * Determines if a string should be skipped from translation
   */
  private shouldSkipString(str: string, path: string): boolean {
    // Skip IDs (MongoDB ObjectIds and similar)
    if (/^[a-f0-9]{24}$/i.test(str)) {
      return true
    }

    // Skip URLs
    if (/^https?:\/\//.test(str)) {
      return true
    }

    // Skip file paths
    if (/^\/\S*\.(jpg|jpeg|png|gif|webp|svg|pdf|mp4|webm|ogg|mp3|wav)$/i.test(str)) {
      return true
    }

    // Skip email addresses
    if (/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(str)) {
      return true
    }

    // Skip ISO date strings
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
      return true
    }

    // Skip date-time strings like "2019-01-31 12:05:04"
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
      return true
    }

    // Skip percentages like "100%"
    if (/^\d+%$/.test(str)) {
      return true
    }

    // Skip pure numbers
    if (/^\d+$/.test(str)) {
      return true
    }

    // Skip whitespace-only strings (including single spaces)
    if (str.trim().length === 0) {
      return true
    }

    // Skip very short strings based on config (default: 3 characters)
    const minLength = this.config.minStringLength !== undefined ? this.config.minStringLength : 3
    if (str.trim().length < minLength) {
      return true
    }

    // Skip status values
    if (['archived', 'draft', 'pending', 'published'].includes(str.toLowerCase())) {
      return true
    }

    // Skip paths ending with id, createdAt, updatedAt, etc.
    const pathLower = path.toLowerCase()
    if (
      pathLower.endsWith('id') ||
      pathLower.endsWith('_id') ||
      pathLower.includes('createdat') ||
      pathLower.includes('updatedat')
    ) {
      return true
    }

    return false
  }

  /**
   * Translates using OpenAI API (optimized version)
   */
  private async translateWithOpenAI(
    data: any,
    fromLocale: string,
    toLocale: string,
    payload: Payload,
  ): Promise<any> {
    const client = this.getOpenAIClient()

    // Use optimization by default (can be disabled via config)
    const useOptimization = this.config.optimizeTranslation !== false

    if (!useOptimization) {
      // Use legacy approach: send entire structure
      return this.translateWithOpenAILegacy(data, fromLocale, toLocale, payload)
    }

    // Extract only translatable strings with deduplication
    const { deduplicationMap, metadata, strings } = this.extractTranslatableStrings(data)

    if (strings.size === 0) {
      // Nothing to translate
      return data
    }

    // Create a simple object with just the strings to translate
    const stringsToTranslate: Record<string, string> = {}
    strings.forEach((value, key) => {
      stringsToTranslate[key] = value
    })

    if (this.config.debugging) {
      const originalSize = JSON.stringify(data).length
      const optimizedSize = JSON.stringify(stringsToTranslate).length
      const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1)

      // Calculate deduplication stats
      let totalPaths = 0
      deduplicationMap.forEach((paths) => {
        totalPaths += paths.length
      })
      const deduplicationSavings = totalPaths - strings.size
      const deduplicationPercent =
        totalPaths > 0 ? ((deduplicationSavings / totalPaths) * 100).toFixed(1) : '0'

      console.log('[Auto-Translate] ✨ Optimization Stats:')
      console.log(`  📊 Unique strings to translate: ${strings.size}`)
      console.log(`  🔄 Total string instances: ${totalPaths}`)
      console.log(
        `  💾 Deduplication savings: ${deduplicationSavings} strings (${deduplicationPercent}%)`,
      )
      console.log(`  📦 Original JSON size: ${originalSize.toLocaleString()} bytes`)
      console.log(`  📦 Optimized JSON size: ${optimizedSize.toLocaleString()} bytes`)
      console.log(`  🎯 Total size reduction: ${reduction}%`)
    }

    try {
      // Get translation settings from global
      const settings = await this.getTranslationSettings(payload)

      // Add timeout configuration (default 30 seconds, configurable via plugin options)
      const timeout = this.config.provider?.timeout || 30000

      if (this.config.debugging) {
        console.log(
          `[Auto-Translate] Calling OpenAI API (timeout: ${timeout}ms, model: ${settings.model})`,
        )
        console.log(
          `[Auto-Translate] Payload size: ${JSON.stringify(stringsToTranslate).length} bytes`,
        )
      }

      // Build system message from settings
      const systemPrompt = settings.systemPrompt
        .replace('{fromLocale}', fromLocale)
        .replace('{toLocale}', toLocale)

      const systemMessage = `${systemPrompt}\n\n${settings.translationRules}`

      const requestParams: any = {
        messages: [
          {
            content: systemMessage,
            role: 'system',
          },
          {
            content: JSON.stringify(stringsToTranslate, null, 2),
            role: 'user',
          },
        ],
        model: settings.model,
        response_format: { type: 'json_object' },
        temperature: settings.temperature,
      }

      // Add maxTokens if specified
      if (settings.maxTokens) {
        requestParams.max_tokens = settings.maxTokens
      }

      const response = await client.chat.completions.create(requestParams, { timeout })

      const translatedText = response.choices[0]?.message?.content

      if (!translatedText) {
        throw new Error('No translation received from OpenAI')
      }

      if (this.config.debugging) {
        console.log(
          `[Auto-Translate] Received response from OpenAI (${translatedText.length} chars)`,
        )
      }

      let translatedStrings: any
      try {
        translatedStrings = JSON.parse(translatedText)
      } catch (parseError) {
        console.error('[Auto-Translate] Failed to parse OpenAI response as JSON')
        console.error('[Auto-Translate] Response text:', translatedText.substring(0, 500))
        throw new Error(
          `Invalid JSON response from OpenAI: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        )
      }

      // Convert back to Map
      const translationsMap = new Map<string, string>()
      for (const [key, value] of Object.entries(translatedStrings)) {
        if (typeof value === 'string') {
          translationsMap.set(key, value)
        }
      }

      // Reconstruct the full data structure with translations, applying deduplication
      return this.reconstructWithTranslations(metadata, translationsMap, deduplicationMap)
    } catch (error) {
      console.error('[Auto-Translate] Translation error:', error)

      // Provide more context about the error
      if (error && typeof error === 'object') {
        const err = error as any
        if (err.status) {
          console.error(`[Auto-Translate] OpenAI API status: ${err.status}`)
        }
        if (err.code) {
          console.error(`[Auto-Translate] Error code: ${err.code}`)
        }
        if (err.message) {
          console.error(`[Auto-Translate] Error message: ${err.message}`)
        }
      }

      // Add context to the error before re-throwing
      const contextualError = new Error(
        `Translation failed from ${fromLocale} to ${toLocale}: ${error instanceof Error ? error.message : String(error)}`,
      )
      contextualError.cause = error
      throw contextualError
    }
  }

  /**
   * Legacy translation method (sends entire structure)
   */
  private async translateWithOpenAILegacy(
    data: any,
    fromLocale: string,
    toLocale: string,
    payload: Payload,
  ): Promise<any> {
    const client = this.getOpenAIClient()
    const timeout = this.config.provider?.timeout || 30000

    try {
      // Get translation settings from global
      const settings = await this.getTranslationSettings(payload)

      // Build system message from settings
      const systemPrompt = settings.systemPrompt
        .replace('{fromLocale}', fromLocale)
        .replace('{toLocale}', toLocale)

      const systemMessage = `${systemPrompt}\n\n${settings.translationRules}`

      const requestParams: any = {
        messages: [
          {
            content: systemMessage,
            role: 'system',
          },
          {
            content: JSON.stringify(data, null, 2),
            role: 'user',
          },
        ],
        model: settings.model,
        response_format: { type: 'json_object' },
        temperature: settings.temperature,
      }

      // Add maxTokens if specified
      if (settings.maxTokens) {
        requestParams.max_tokens = settings.maxTokens
      }

      const response = await client.chat.completions.create(requestParams, { timeout })

      const translatedText = response.choices[0]?.message?.content

      if (!translatedText) {
        throw new Error('No translation received from OpenAI')
      }

      return JSON.parse(translatedText)
    } catch (error) {
      console.error('[Auto-Translate] Translation error:', error)
      throw error
    }
  }

  /**
   * Gets global and collection-specific excluded fields
   */
  getConfigExcludedFields(collection: string): string[] {
    const globalExclusions = this.config.excludeFields || []
    const collectionConfig = this.config.collections?.[collection]

    if (typeof collectionConfig === 'object' && collectionConfig.excludeFields) {
      return [...globalExclusions, ...collectionConfig.excludeFields]
    }

    return globalExclusions
  }

  /**
   * Gets translation exclusions for a document
   */
  async getExclusions(
    payload: Payload,
    collection: string,
    documentId: string,
    locale: string,
  ): Promise<string[]> {
    const exclusionsSlug = this.config.translationExclusionsSlug || 'translation-exclusions'

    try {
      const result = await payload.find({
        collection: exclusionsSlug,
        limit: 1,
        where: {
          and: [
            { collection: { equals: collection } },
            { documentId: { equals: documentId } },
            { locale: { equals: locale } },
          ],
        },
      })

      if (result.docs.length > 0) {
        const exclusion = result.docs[0] as any
        return exclusion.excludedPaths?.map((item: any) => item.path) || []
      }

      return []
    } catch (error) {
      if (this.config.debugging) {
        payload.logger.error(`[Auto-Translate] Error fetching exclusions: ${error}`)
      }
      return []
    }
  }

  /**
   * Main translation method
   */
  async translate(options: TranslateOptions): Promise<any> {
    const { collection, data, excludedPaths = [], fromLocale, payload, toLocale } = options

    // Filter out excluded paths before translation
    const dataToTranslate = filterExcludedPaths(data, excludedPaths)

    if (this.config.debugging) {
      payload.logger.info(
        `[Auto-Translate] Translating from ${fromLocale} to ${toLocale} for collection ${collection}`,
      )
      payload.logger.info(`[Auto-Translate] Excluded paths: ${excludedPaths.join(', ')}`)
    }

    // Use custom translator if provided
    if (this.config.provider?.customTranslate) {
      return await this.config.provider.customTranslate(options)
    }

    // Use OpenAI by default
    return await this.translateWithOpenAI(dataToTranslate, fromLocale, toLocale, payload)
  }

  /**
   * Updates translation exclusions for a document
   */
  async updateExclusions(
    payload: Payload,
    collection: string,
    documentId: string,
    locale: string,
    excludedPaths: string[],
  ): Promise<void> {
    const exclusionsSlug = this.config.translationExclusionsSlug || 'translation-exclusions'

    try {
      const existing = await payload.find({
        collection: exclusionsSlug,
        limit: 1,
        where: {
          and: [
            { collection: { equals: collection } },
            { documentId: { equals: documentId } },
            { locale: { equals: locale } },
          ],
        },
      })

      const exclusionsData = {
        collection,
        documentId,
        excludedPaths: excludedPaths.map((path) => ({ path })),
        locale,
      }

      if (existing.docs.length > 0) {
        await payload.update({
          id: existing.docs[0].id,
          collection: exclusionsSlug,
          data: exclusionsData,
        })
      } else {
        await payload.create({
          collection: exclusionsSlug,
          data: exclusionsData,
        })
      }

      if (this.config.debugging) {
        payload.logger.info(
          `[Auto-Translate] Updated exclusions for ${collection}:${documentId}:${locale}`,
        )
      }
    } catch (error) {
      if (this.config.debugging) {
        payload.logger.error(`[Auto-Translate] Error updating exclusions: ${error}`)
      }
    }
  }
}
