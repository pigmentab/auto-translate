import type { CollectionConfig } from 'payload'

export const getTranslationExclusionsCollection = (
  slug: string = 'translation-exclusions',
): CollectionConfig => ({
  slug,
  access: {
    create: () => true,
    delete: () => true,
    read: () => true,
    update: () => true,
  },
  admin: {
    description: 'Stores field-level translation exclusions for documents',
  },
  fields: [
    {
      name: 'collection',
      type: 'text',
      index: true,
      required: true,
    },
    {
      name: 'documentId',
      type: 'text',
      index: true,
      required: true,
    },
    {
      name: 'locale',
      type: 'text',
      index: true,
      required: true,
    },
    {
      name: 'excludedPaths',
      type: 'array',
      fields: [
        {
          name: 'path',
          type: 'text',
          required: true,
        },
      ],
      required: true,
    },
  ],
})
