import type { Config } from 'payload'

import type { AutoTranslateConfig } from './types/index.js'

import { getTranslationExclusionsCollection } from './collections/translationExclusions.js'
import { getTranslationSettingsGlobal } from './globals/translationSettings.js'
import { TranslationService } from './services/translationService.js'
import { injectTranslationControls } from './utilities/injectTranslationControls.js'

export { getTranslationExclusionsCollection } from './collections/translationExclusions.js'
export { getTranslationSettingsGlobal } from './globals/translationSettings.js'
export { TranslationService } from './services/translationService.js'
export * from './types/index.js'

export const autoTranslate =
  (pluginOptions: AutoTranslateConfig) =>
  (config: Config): Config => {
    // Validate configuration
    if (!config.collections) {
      config.collections = []
    }

    if (!config.localization) {
      console.warn(
        '[Auto-Translate Plugin] No localization config found. Plugin will not function properly.',
      )
      return config
    }

    const localizationConfig = config.localization
    const defaultLocale = localizationConfig.defaultLocale
    const allLocales = Array.isArray(localizationConfig.locales)
      ? localizationConfig.locales.map((l) => (typeof l === 'string' ? l : l.code))
      : []

    // Default enableExclusions to true for backward compatibility
    const enableExclusions = pluginOptions.enableExclusions !== false

    if (pluginOptions.debugging) {
      console.log('[Auto-Translate Plugin] Configuration:')
      console.log('- Default locale:', defaultLocale)
      console.log('- All locales:', allLocales)
      console.log('- Enabled collections:', Object.keys(pluginOptions.collections || {}))
      console.log('- Exclusions enabled:', enableExclusions)
    }

    // Add translation exclusions collection (only if exclusions are enabled)
    if (enableExclusions) {
      const exclusionsSlug = pluginOptions.translationExclusionsSlug || 'translation-exclusions'
      config.collections.push(getTranslationExclusionsCollection(exclusionsSlug))
    }

    // Add translation settings global
    if (!config.globals) {
      config.globals = []
    }
    const settingsSlug = pluginOptions.translationSettingsSlug || 'translation-settings'
    config.globals.push(getTranslationSettingsGlobal(settingsSlug))

    // Initialize translation service
    const translationService = new TranslationService(pluginOptions)

    // Configure collections with auto-translate
    if (pluginOptions.collections) {
      for (const collectionSlug in pluginOptions.collections) {
        const collectionConfig = pluginOptions.collections[collectionSlug]

        // Skip if disabled
        if (
          collectionConfig === false ||
          (typeof collectionConfig === 'object' && collectionConfig.enabled === false)
        ) {
          continue
        }

        const collection = config.collections.find((c) => c.slug === collectionSlug)

        if (!collection) {
          console.warn(`[Auto-Translate Plugin] Collection "${collectionSlug}" not found in config`)
          continue
        }

        // Add translationSync field to collection
        collection.fields.push({
          name: 'translationSync',
          type: 'checkbox',
          admin: {
            description:
              'When enabled, changes in the default language will automatically translate to other languages',
            position: 'sidebar',
          },
          defaultValue: pluginOptions.enableTranslationSyncByDefault ?? true,
          label: 'Enable Auto-Translation',
        })

        // Auto-inject TranslationControl component into all localized fields
        // Only inject if exclusions are enabled (otherwise there's nothing to control)
        if (enableExclusions && pluginOptions.autoInjectUI !== false) {
          collection.fields = injectTranslationControls(collection.fields, defaultLocale)

          if (pluginOptions.debugging) {
            console.log(`[Auto-Translate Plugin] Auto-injected UI controls for: ${collectionSlug}`)
          }
        }

        // Add hooks for translation
        if (!collection.hooks) {
          collection.hooks = {}
        }

        if (!collection.hooks.afterOperation) {
          collection.hooks.afterOperation = []
        }

        // Main translation hook
        collection.hooks.afterOperation.push(async ({ operation, req, result }) => {
          // Only process create and update operations
          if (operation !== 'create' && operation !== 'updateByID') {
            if (pluginOptions.debugging) {
              req.payload.logger.error(
                `[Auto-Translate Plugin] Skipping translation - not create or update operation: ${operation}`,
              )
            }
            return result
          }

          // For create/update operations, result should have a id property
          if (!result || typeof result !== 'object' || !('id' in result)) {
            if (pluginOptions.debugging) {
              req.payload.logger.error(
                `[Auto-Translate Plugin] No document found in result: ${JSON.stringify(result)}`,
              )
            }
            return result
          }

          const doc = result

          // Only translate if editing from default locale
          if (req.locale !== defaultLocale) {
            if (pluginOptions.debugging) {
              req.payload.logger.info(
                `[Auto-Translate Plugin] Skipping translation - not default locale (current: ${req.locale}, default: ${defaultLocale})`,
              )
            }
            return result
          }

          // Skip translation for drafts when autosave is enabled
          // Only translate when document is published
          if (doc._status && doc._status !== 'published') {
            if (pluginOptions.debugging) {
              req.payload.logger.info(
                `[Auto-Translate Plugin] Skipping translation - document is a draft (status: ${doc._status})`,
              )
            }
            return result
          }

          // Check if translation sync is enabled
          if (!doc.translationSync) {
            if (pluginOptions.debugging) {
              req.payload.logger.info(
                `[Auto-Translate Plugin] Skipping translation - translationSync disabled for ${collectionSlug}:${doc.id}`,
              )
            }
            return result
          }

          if (pluginOptions.debugging) {
            req.payload.logger.info(
              `[Auto-Translate Plugin] Processing ${collectionSlug} document ${operation}: ${doc.id}`,
            )
          }

          // Get secondary locales (all locales except default)
          const secondaryLocales = allLocales.filter((locale) => locale !== defaultLocale)

          // Translate to each secondary locale
          for (const targetLocale of secondaryLocales) {
            try {
              if (pluginOptions.debugging) {
                req.payload.logger.info(
                  `[Auto-Translate Plugin] Translating ${collectionSlug}:${doc.id} from ${defaultLocale} to ${targetLocale}`,
                )
              }

              // Get field-level exclusions for this locale (only if exclusions are enabled)
              let excludedPaths: string[] = []
              if (enableExclusions) {
                excludedPaths = await translationService.getExclusions(
                  req.payload,
                  collectionSlug,
                  doc.id.toString(),
                  targetLocale,
                )
              }

              // Get global/collection-level excluded fields
              const configExcludedFields =
                translationService.getConfigExcludedFields(collectionSlug)
              const allExcludedPaths = [...excludedPaths, ...configExcludedFields]

              if (pluginOptions.debugging && allExcludedPaths.length > 0) {
                req.payload.logger.info(
                  `[Auto-Translate Plugin] Excluded paths for ${targetLocale}: ${allExcludedPaths.join(', ')}`,
                )
              }

              // Get existing document in target locale to preserve excluded fields
              // Only needed if exclusions are enabled
              let existingDoc: any = null
              if (enableExclusions && allExcludedPaths.length > 0) {
                try {
                  const existingResult = await req.payload.findByID({
                    id: doc.id,
                    collection: collectionSlug,
                    fallbackLocale: false,
                    locale: targetLocale,
                  })
                  existingDoc = existingResult
                } catch (error) {
                  // Document doesn't exist in this locale yet, that's okay
                  if (pluginOptions.debugging) {
                    req.payload.logger.info(
                      `[Auto-Translate Plugin] No existing document for ${targetLocale}, will create new`,
                    )
                  }
                }
              }

              // Translate the document
              const translatedData = await translationService.translate({
                collection: collectionSlug,
                data: doc,
                excludedPaths: allExcludedPaths,
                fromLocale: defaultLocale,
                payload: req.payload,
                toLocale: targetLocale,
              })

              // Merge translated data with existing, preserving excluded fields
              const finalData = translatedData
              if (existingDoc && allExcludedPaths.length > 0) {
                // Preserve excluded fields from existing document
                for (const excludedPath of allExcludedPaths) {
                  const existingValue = getNestedValue(existingDoc, excludedPath)
                  if (existingValue !== undefined) {
                    setNestedValue(finalData, excludedPath, existingValue)
                  }
                }
              }

              // Update the document in the target locale
              await req.payload.update({
                id: doc.id,
                collection: collectionSlug,
                data: finalData,
                locale: targetLocale,
                // Prevent infinite loop - don't trigger hooks
                context: {
                  skipAutoTranslate: true,
                },
                req,
              })

              if (pluginOptions.debugging) {
                req.payload.logger.info(
                  `[Auto-Translate Plugin] Successfully translated ${collectionSlug}:${doc.id} to ${targetLocale}`,
                )
              }
            } catch (error) {
              // Log detailed error information
              const errorMessage = error instanceof Error ? error.message : String(error)
              const errorStack = error instanceof Error ? error.stack : undefined
              const errorDetails = {
                collection: collectionSlug,
                documentId: doc.id,
                fromLocale: defaultLocale,
                message: errorMessage,
                stack: errorStack,
                toLocale: targetLocale,
              }

              req.payload.logger.error(
                `[Auto-Translate Plugin] Error translating ${collectionSlug}:${doc.id} to ${targetLocale}:`,
              )
              req.payload.logger.error(errorMessage)

              if (pluginOptions.debugging && errorStack) {
                req.payload.logger.error('Stack trace:')
                req.payload.logger.error(errorStack)
              }

              // Log additional context if it's an OpenAI error
              if (error && typeof error === 'object' && 'error' in error) {
                req.payload.logger.error('OpenAI error details:', JSON.stringify(error, null, 2))
              }

              // Continue with other locales even if one fails
            }
          }

          return result
        })

        // Prevent infinite loops - skip translation if triggered by our own update
        const originalAfterOperationHooks = [...(collection.hooks.afterOperation || [])]
        collection.hooks.afterOperation = [
          async (args) => {
            // Skip if this update was triggered by auto-translate
            // Context might not be available on all operations
            if ('req' in args && args.req?.context?.skipAutoTranslate) {
              return args.result
            }

            // Run all hooks including translation
            for (const hook of originalAfterOperationHooks) {
              const result = await hook(args)
              if (result !== undefined) {
                args.result = result
              }
            }

            return args.result
          },
        ]

        if (pluginOptions.debugging) {
          console.log(`[Auto-Translate Plugin] Configured collection: ${collectionSlug}`)
        }
      }
    }

    /**
     * If the plugin is disabled, we still want to keep added collections/fields
     * so the database schema is consistent which is important for migrations.
     */
    if (pluginOptions.disabled) {
      return config
    }

    return config
  }

/**
 * Helper function to get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, part) => {
    if (current === null || current === undefined) {
      return undefined
    }
    return current[part]
  }, obj)
}

/**
 * Helper function to set nested value in object using dot notation
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!(part in current) || current[part] === null || typeof current[part] !== 'object') {
      // Check if next part is a number (array index)
      const nextPart = parts[i + 1]
      current[part] = /^\d+$/.test(nextPart) ? [] : {}
    }
    current = current[part]
  }

  current[parts[parts.length - 1]] = value
}
