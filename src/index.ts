import type { CollectionSlug, Config } from 'payload'

import OpenAI from 'openai'

import { customEndpointHandler } from './endpoints/customEndpointHandler.js'

export type AutoTranslateConfig = {
  /**
   * List of collections to add a custom field
   */
  collections?: Partial<Record<CollectionSlug, true>>
  disabled?: boolean
}

export const autoTranslate =
  (pluginOptions: AutoTranslateConfig) =>
  (config: Config): Config => {
    if (!config.collections) {
      config.collections = []
    }

    config.collections.push({
      slug: 'plugin-collection',
      fields: [
        {
          name: 'id',
          type: 'text',
        },
      ],
    })

    const localizationConfig = config.localization

    // if (localizationConfig) {
    //   // Access all enabled locales
    //   const locales = localizationConfig.locales // Array of locale codes like ['en', 'es', 'fr']
    //   const defaultLocale = localizationConfig.defaultLocale // The default locale
    //   const fallback = localizationConfig.fallback // Whether fallback is enabled

    //   console.log('locales', locales)
    //   console.log('defaultLocale', defaultLocale)
    //   console.log('fallback', fallback)
    // }

    if (pluginOptions.collections) {
      for (const collectionSlug in pluginOptions.collections) {
        const collection = config.collections.find(
          (collection) => collection.slug === collectionSlug,
        )

        if (collection) {
          collection.fields.push({
            name: 'addedByPlugin',
            type: 'text',
            admin: {
              position: 'sidebar',
            },
          })

          // afterChange hook
          if (!collection.hooks) {
            collection.hooks = {}
          }

          if (!collection.hooks.afterChange) {
            collection.hooks.afterChange = []
          }

          collection.hooks.afterChange.push(async ({ doc, operation, req }) => {
            req.payload.logger.info(
              `[Auto-Translate Plugin] ${collection.slug} document ${operation}: ${doc.id}`,
            )

            const locales = ['en', 'sv']
            const defaultLocale = 'sv'

            // TODO: Trigger translation or other logic
            if (
              (operation === 'create' || operation === 'update') &&
              req.locale === defaultLocale
            ) {
              console.log('doc', doc)
              const translated: Record<string, any> = {}

              const translateField = async (value: any) => {
                const client = new OpenAI({
                  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
                })

                const response = await client.responses.create({
                  input: value,
                  instructions: 'Translate the following text to english',
                  model: 'gpt-4o',
                })

                return response.output_text
              }

              await Promise.all(
                Object.entries(doc).map(async ([key, value]) => {
                  if (['createdAt', 'id', 'updatedAt'].includes(key)) {
                    return
                  }

                  return translateField(value).then((translatedValue) => {
                    translated[key] = translatedValue
                    return translated
                  })
                }),
              )

              console.log('translated')

              await req.payload.update({
                id: doc.id,
                collection: collection.slug,
                data: translated,
                locale: locales.find((locale) => locale !== req.locale),
              })
              // auto-translate logic here
              // const coll = await req.payload.find({
              //   collection: collection.slug,
              //   fallbackLocale: false,
              //   locale: locales.find((locale) => locale !== req.locale),
              //   where: {
              //     id: {
              //       equals: doc.id,
              //     },
              //   },
              // })
              // console.log('coll', coll)
            }
          })
        }
      }
    }

    /**
     * If the plugin is disabled, we still want to keep added collections/fields so the database schema is consistent which is important for migrations.
     * If your plugin heavily modifies the database schema, you may want to remove this property.
     */
    if (pluginOptions.disabled) {
      return config
    }

    if (!config.endpoints) {
      config.endpoints = []
    }

    if (!config.admin) {
      config.admin = {}
    }

    if (!config.admin.components) {
      config.admin.components = {}
    }

    if (!config.admin.components.beforeDashboard) {
      config.admin.components.beforeDashboard = []
    }

    config.admin.components.beforeDashboard.push(`auto-translate/client#BeforeDashboardClient`)
    config.admin.components.beforeDashboard.push(`auto-translate/rsc#BeforeDashboardServer`)

    config.endpoints.push({
      handler: customEndpointHandler,
      method: 'get',
      path: '/my-plugin-endpoint',
    })

    const incomingOnInit = config.onInit

    config.onInit = async (payload) => {
      // Ensure we are executing any existing onInit functions before running our own.
      if (incomingOnInit) {
        await incomingOnInit(payload)
      }

      const { totalDocs } = await payload.count({
        collection: 'plugin-collection',
        where: {
          id: {
            equals: 'seeded-by-plugin',
          },
        },
      })

      if (totalDocs === 0) {
        await payload.create({
          collection: 'plugin-collection',
          data: {
            id: 'seeded-by-plugin',
          },
        })
      }
    }

    return config
  }
