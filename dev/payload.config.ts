import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { autoTranslate } from '@pigment/auto-translate'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { testEmailAdapter } from './helpers/testEmailAdapter.js'
import { seed } from './seed.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname
}

const buildConfigWithMemoryDB = async () => {
  if (process.env.NODE_ENV === 'test') {
    const memoryDB = await MongoMemoryReplSet.create({
      replSet: {
        count: 3,
        dbName: 'payloadmemory',
      },
    })

    process.env.DATABASE_URI = `${memoryDB.getUri()}&retryWrites=true`
  }

  return buildConfig({
    admin: {
      importMap: {
        baseDir: path.resolve(dirname),
      },
    },
    collections: [
      {
        slug: 'posts',
        fields: [
          {
            name: 'title',
            type: 'text',
            localized: true,
            required: true,
          },
          {
            name: 'description',
            type: 'richText',
            localized: true,
            required: true,
          },
          {
            name: 'content',
            type: 'array',
            fields: [
              {
                name: 'title',
                type: 'text',
              },
              {
                name: 'image',
                type: 'upload',
                relationTo: 'media',
              },
            ],
            localized: true,
          },
        ],
        versions: {
          drafts: {
            autosave: true,
          },
        },
      },
      {
        slug: 'pages',
        fields: [
          {
            name: 'title',
            type: 'text',
            localized: true,
            required: true,
          },
          {
            name: 'slug',
            type: 'text',
            required: true,
          },
          // Test group field (should NOT show control on group itself, only on nested fields)
          {
            name: 'seo',
            type: 'group',
            fields: [
              {
                name: 'metaTitle',
                type: 'text',
                label: 'Meta Title',
                localized: true,
              },
              {
                name: 'metaDescription',
                type: 'textarea',
                label: 'Meta Description',
                localized: true,
              },
            ],
            label: 'SEO Settings',
            localized: true,
          },
          // Test blocks field (should show controls on fields inside blocks)
          {
            name: 'layout',
            type: 'blocks',
            blocks: [
              {
                slug: 'hero',
                fields: [
                  {
                    name: 'heading',
                    type: 'text',
                    label: 'Hero Heading',
                    localized: true,
                    required: true,
                  },
                  {
                    name: 'subheading',
                    type: 'textarea',
                    label: 'Subheading',
                    localized: true,
                  },
                  {
                    name: 'ctaText',
                    type: 'text',
                    label: 'CTA Button Text',
                    localized: true,
                  },
                ],
              },
              {
                slug: 'content',
                fields: [
                  {
                    name: 'heading',
                    type: 'text',
                    label: 'Content Heading',
                    localized: true,
                  },
                  {
                    name: 'text',
                    type: 'richText',
                    label: 'Content',
                    localized: true,
                  },
                ],
              },
            ],
            label: 'Page Layout',
            localized: true,
          },
          // Test array field with nested localized fields
          {
            name: 'features',
            type: 'array',
            fields: [
              {
                name: 'title',
                type: 'text',
                label: 'Feature Title',
                localized: true,
              },
              {
                name: 'description',
                type: 'textarea',
                label: 'Feature Description',
                localized: true,
              },
            ],
            label: 'Features',
            localized: true,
          },
        ],
        versions: {
          drafts: {
            autosave: true,
          },
        },
      },
      {
        slug: 'landing-pages',
        fields: [
          {
            name: 'title',
            type: 'text',
            localized: true,
            required: true,
          },
          // Test tabs field (should NOT show control on tabs field itself)
          {
            name: 'contentFields',
            type: 'tabs',
            tabs: [
              {
                label: 'Hero',
                // Unnamed tab - fields use their natural paths
                fields: [
                  {
                    name: 'hero',
                    type: 'group',
                    fields: [
                      {
                        name: 'label',
                        type: 'text',
                        label: 'Hero Label',
                        localized: true,
                      },
                      {
                        name: 'title',
                        type: 'text',
                        label: 'Hero Title',
                        localized: true,
                      },
                      {
                        name: 'description',
                        type: 'textarea',
                        label: 'Hero Description',
                        localized: true,
                      },
                    ],
                    label: 'Page Hero',
                    localized: true,
                  },
                ],
              },
              {
                label: 'Content',
                // Unnamed tab
                fields: [
                  {
                    name: 'layout',
                    type: 'blocks',
                    blocks: [
                      {
                        slug: 'text',
                        fields: [
                          {
                            name: 'content',
                            type: 'textarea',
                            localized: true,
                          },
                        ],
                      },
                    ],
                    localized: true,
                  },
                ],
              },
              {
                name: 'meta',
                label: 'SEO',
                // Named tab - fields are under 'meta' path
                fields: [
                  {
                    name: 'metaTitle',
                    type: 'text',
                    label: 'Meta Title',
                    localized: true,
                  },
                  {
                    name: 'metaDescription',
                    type: 'textarea',
                    label: 'Meta Description',
                    localized: true,
                  },
                ],
                localized: true,
              },
            ],
          },
        ],
        versions: {
          drafts: {
            autosave: true,
          },
        },
      },
      {
        slug: 'media',
        fields: [],
        upload: {
          staticDir: path.resolve(dirname, 'media'),
        },
      },
    ],
    db: mongooseAdapter({
      ensureIndexes: true,
      url: process.env.DATABASE_URI || '',
    }),
    editor: lexicalEditor(),
    email: testEmailAdapter,
    localization: {
      defaultLocale: 'sv',
      fallback: true,
      locales: [
        {
          code: 'sv',
          label: 'Svenska',
        },
        {
          code: 'en',
          label: 'English',
        },
        {
          code: 'de',
          label: 'Deutsch',
        },
      ],
    },
    onInit: async (payload) => {
      // Auto-seed on first run (skips if data exists)
      // To disable auto-seeding, comment out the line below
      await seed(payload)
    },
    plugins: [
      autoTranslate({
        autoInjectUI: false, // Enable auto-injection of translation controls
        collections: {
          posts: true,
        },
        enableTranslationSyncByDefault: true,
      }),
    ],
    secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
    sharp,
    typescript: {
      outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
  })
}

export default buildConfigWithMemoryDB()
