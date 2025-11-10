import type { Payload } from 'payload'

import OpenAI from 'openai'

import type { AutoTranslateConfig, TranslateOptions, TranslationSettings } from '../types/index.js'

import { filterExcludedPaths } from '../utilities/fieldHelpers.js'

const DEFAULT_SETTINGS: TranslationSettings = {
  model: 'gpt-4o',
  systemPrompt: `You are a professional translator. Translate the JSON object values from {fromLocale} to {toLocale}.`,
  temperature: 0.3,
  translationRules: `Rules:
- Only translate the values, never the keys
- Preserve the exact JSON structure
- Do not translate field names like 'id', 'createdAt', 'updatedAt', etc.
- Maintain formatting, HTML tags, and special characters
- Return only valid JSON without any markdown formatting or code blocks
- If a value is already in the target language or is a proper noun, keep it as is`,
}

export class TranslationService {
  private client?: OpenAI
  private config: AutoTranslateConfig

  constructor(config: AutoTranslateConfig) {
    this.config = config
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
   * Fetches translation settings from the global with fallback to defaults
   */
  private async getTranslationSettings(payload: Payload): Promise<TranslationSettings> {
    const settingsSlug = this.config.translationSettingsSlug || 'translation-settings'

    try {
      const settings = await payload.findGlobal({
        slug: settingsSlug,
      })

      if (settings) {
        return {
          maxTokens: settings.maxTokens,
          model: settings.model || DEFAULT_SETTINGS.model,
          systemPrompt: settings.systemPrompt || DEFAULT_SETTINGS.systemPrompt,
          temperature: settings.temperature ?? DEFAULT_SETTINGS.temperature,
          translationRules: settings.translationRules || DEFAULT_SETTINGS.translationRules,
        }
      }
    } catch (error) {
      if (this.config.debugging) {
        payload.logger.warn(
          `[Auto-Translate] Could not fetch settings from global, using defaults: ${error}`,
        )
      }
    }

    return DEFAULT_SETTINGS
  }

  /**
   * Translates using OpenAI API
   */
  private async translateWithOpenAI(
    data: any,
    fromLocale: string,
    toLocale: string,
    payload: Payload,
  ): Promise<any> {
    const client = this.getOpenAIClient()
    const settings = await this.getTranslationSettings(payload)

    // Use provider model override if specified, otherwise use settings model
    const model = this.config.provider?.model || settings.model

    // Replace placeholders in system prompt and combine with rules
    const mainPrompt = settings.systemPrompt
      .replace(/\{fromLocale\}/g, fromLocale)
      .replace(/\{toLocale\}/g, toLocale)

    const fullPrompt = `${mainPrompt}
${settings.translationRules}`

    try {
      const completionOptions: any = {
        messages: [
          {
            content: fullPrompt,
            role: 'system',
          },
          {
            content: JSON.stringify(data, null, 2),
            role: 'user',
          },
        ],
        model,
        response_format: { type: 'json_object' },
        temperature: settings.temperature,
      }

      // Add maxTokens only if specified
      if (settings.maxTokens) {
        completionOptions.max_tokens = settings.maxTokens
      }

      const response = await client.chat.completions.create(completionOptions)

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
