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

// Fields that must never be passed as data to payload.update / payload.create
// (Postgres/drizzle rejects them; MongoDB silently ignores them)
const SYSTEM_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  '_status',
  '__v',
  'globalType',
  'updatedBy',
])

function stripSystemFields(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (!SYSTEM_FIELDS.has(key)) {
      result[key] = value
    }
  }
  return result
}

/**
 * Strips `id` from objects that are direct elements of arrays, recursively
 * through the data tree.  This prevents Postgres unique-constraint violations
 * when inserting locale-specific rows into array tables (e.g. posts_content)
 * that share a single PRIMARY KEY on `id` across all locales.
 *
 * Relationship objects (plain objects that are NOT direct array items) keep
 * their `id` so that Payload can still resolve them correctly.
 */
function stripArrayItemIds(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        // Direct array item — strip its Payload-internal `id`
        const { id: _id, ...rest } = item as Record<string, unknown>
        const processed: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(rest)) {
          processed[key] = stripArrayItemIds(value)
        }
        return processed
      }
      return stripArrayItemIds(item)
    })
  }

  if (data && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = stripArrayItemIds(value)
    }
    return result
  }

  return data
}

export const autoTranslate =
  (pluginOptions: AutoTranslateConfig) =>
  (incomingConfig: Config): Config => {
    // Create a shallow copy so we never mutate the caller's config object
    const config: Config = { ...incomingConfig }

    // If the plugin is disabled, return config immediately without any modifications
    if (pluginOptions.disabled) {
      if (pluginOptions.debugging) {
        console.log('[Auto-Translate Plugin] Plugin is disabled, skipping all modifications')
      }
      return config
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
    // Use spread to avoid mutating the original array
    if (enableExclusions) {
      const exclusionsSlug = pluginOptions.translationExclusionsSlug || 'translation-exclusions'
      config.collections = [
        ...(config.collections || []),
        getTranslationExclusionsCollection(exclusionsSlug),
      ]
    } else {
      config.collections = [...(config.collections || [])]
    }

    // Add translation settings global using spread
    const settingsSlug = pluginOptions.translationSettingsSlug || 'translation-settings'
    config.globals = [...(config.globals || []), getTranslationSettingsGlobal(settingsSlug)]

    // Initialize translation service
    const translationService = new TranslationService(pluginOptions)

    // Configure collections with auto-translate
    if (pluginOptions.collections) {
      for (const rawSlug in pluginOptions.collections) {
        // Payload 3.85+ requires CollectionSlug (strict union), but for...in
        // yields string. Cast once here and use collectionSlug throughout.
        const collectionSlug = rawSlug as import('payload').CollectionSlug
        const collectionConfig =
          pluginOptions.collections[collectionSlug as keyof typeof pluginOptions.collections]

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
        collection.fields = [
          ...collection.fields,
          {
            name: 'translationSync',
            type: 'checkbox',
            admin: {
              description:
                'When enabled, changes in the default language will automatically translate to other languages',
              position: 'sidebar',
            },
            defaultValue: pluginOptions.enableTranslationSyncByDefault ?? true,
            label: 'Enable Auto-Translation',
          },
        ]

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
        const translationHook = async ({ operation, req, result }: any) => {
          // Only process create and updateByID operations
          if (operation !== 'create' && operation !== 'updateByID') {
            if (pluginOptions.debugging) {
              req.payload.logger.error(
                `[Auto-Translate Plugin] Skipping translation - not create or update operation: ${operation}`,
              )
            }
            return result
          }

          // For create/update operations, result should have an id property
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
              let finalData = { ...translatedData }
              if (existingDoc && allExcludedPaths.length > 0) {
                // Preserve excluded fields from existing document
                for (const excludedPath of allExcludedPaths) {
                  const existingValue = getNestedValue(existingDoc, excludedPath)
                  if (existingValue !== undefined) {
                    setNestedValue(finalData, excludedPath, existingValue)
                  }
                }
              }

              // Strip system/internal fields before updating so Postgres adapter
              // does not receive `id`, `createdAt`, `updatedAt`, etc. as data fields.
              // MongoDB is lenient with extra fields; Postgres/drizzle raises
              // ValidationError: The following field is invalid: id
              //
              // Also strip `id` from nested array items: Payload's array tables
              // (e.g. posts_content) have a shared PRIMARY KEY on `id` across all
              // locales, so reusing source-locale item IDs for a target locale causes
              // a Postgres 23505 unique-constraint violation.
              const strippedArrayIds = stripArrayItemIds(finalData)
              const updateData = stripSystemFields(strippedArrayIds as Record<string, unknown>)

              // Update the document in the target locale
              await req.payload.update({
                id: doc.id,
                collection: collectionSlug,
                data: updateData,
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
                req.payload.logger.error('OpenAI error details:')
                req.payload.logger.error(JSON.stringify(error, null, 2))
              }

              // Continue with other locales even if one fails
            }
          }

          return result
        }

        // Prevent infinite loops - skip translation if triggered by our own update
        // Wrap ALL afterOperation hooks so the skipAutoTranslate context is checked first
        const existingHooks = [...(collection.hooks.afterOperation || []), translationHook]
        collection.hooks.afterOperation = [
          async (args: any) => {
            // Skip if this update was triggered by auto-translate
            if ('req' in args && args.req?.context?.skipAutoTranslate) {
              return args.result
            }

            // Run all hooks including translation
            for (const hook of existingHooks) {
              const hookResult = await hook(args)
              if (hookResult !== undefined) {
                args.result = hookResult
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
