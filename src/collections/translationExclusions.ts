import type { CollectionConfig } from 'payload'

export const getTranslationExclusionsCollection = (
  slug: string = 'translation-exclusions',
): CollectionConfig => ({
  slug,
  access: {
    create: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    defaultColumns: ['collectionSlug', 'documentId', 'locale', 'excludedPaths'],
    description:
      'Stores field-level translation exclusions per document and locale. Each locale can have its own set of excluded fields. There should only be ONE record per (collectionSlug, documentId, locale) combination.',
    group: 'Auto-Translate Settings',
    useAsTitle: 'collectionSlug',
  },
  fields: [
    {
      name: 'collectionSlug',
      type: 'text',
      admin: {
        description: 'The collection this exclusion belongs to',
        position: 'sidebar',
        readOnly: true,
      },
      index: true,
      required: true,
    },
    {
      name: 'documentId',
      type: 'text',
      admin: {
        description: 'The ID of the document',
        position: 'sidebar',
        readOnly: true,
      },
      index: true,
      required: true,
    },
    {
      name: 'locale',
      type: 'text',
      admin: {
        description: 'The locale these exclusions apply to (e.g., "en", "de", "fr")',
        position: 'sidebar',
        readOnly: true,
      },
      index: true,
      label: 'Locale',
      required: true,
    },
    {
      name: 'excludedPaths',
      type: 'array',
      admin: {
        description:
          'Fields that should NOT be auto-translated in this specific locale. Each locale has its own independent set of exclusions.',
      },
      fields: [
        {
          name: 'path',
          type: 'text',
          admin: {
            description: 'Field path (e.g., "title", "content.0.description")',
          },
          label: 'Field Path',
          required: true,
        },
      ],
      label: `Excluded Fields for this Locale`,
      required: true,
    },
  ],
})
