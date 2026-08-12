import type { CollectionConfig } from 'payload'

export const getTranslationExclusionsCollection = (
  slug: string = 'translation-exclusions',
): CollectionConfig => ({
  slug,
  access: {
    create: async ({ data, req }) => {
      if (!req.user || !data?.collectionSlug || !data?.documentId) {
        return false
      }
      try {
        await req.payload.findByID({
          id: data.documentId,
          collection: data.collectionSlug,
          overrideAccess: false,
          req,
        })
        return true
      } catch {
        return false
      }
    },
    delete: async ({ id, req }) => {
      if (!req.user || !id) {
        return false
      }
      try {
        const exclusion = await req.payload.findByID({
          id,
          collection: slug,
          req,
        })
        await req.payload.findByID({
          id: exclusion.documentId,
          collection: exclusion.collectionSlug,
          overrideAccess: false,
          req,
        })
        return true
      } catch {
        return false
      }
    },
    read: async ({ req }) => {
      if (!req.user) {
        return false
      }
      const allowedSlugs: string[] = []
      for (const collectionConfig of req.payload.config.collections) {
        try {
          const readAccess = collectionConfig.access?.read
          const allowed = typeof readAccess === 'function' ? await readAccess({ req }) : true
          if (allowed) {
            allowedSlugs.push(collectionConfig.slug)
          }
        } catch {
          // Deny collections whose own access check throws
        }
      }
      return { collectionSlug: { in: allowedSlugs } }
    },
    update: async ({ id, data, req }) => {
      if (!req.user || !id) {
        return false
      }
      try {
        const exclusion = await req.payload.findByID({
          id,
          collection: slug,
          req,
        })
        const targetCollectionSlug = data?.collectionSlug ?? exclusion.collectionSlug
        const targetDocumentId = data?.documentId ?? exclusion.documentId
        await req.payload.findByID({
          id: targetDocumentId,
          collection: targetCollectionSlug,
          overrideAccess: false,
          req,
        })
        return true
      } catch {
        return false
      }
    },
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
