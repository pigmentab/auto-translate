import type { PayloadRequest } from 'payload'

/**
 * GET endpoint to check if a field is excluded from translation
 */
export const getExclusionStatus = async (req: PayloadRequest): Promise<Response> => {
  const { collection, documentId, locale, fieldPath } = req.query || {}

  if (!collection || !documentId || !locale || !fieldPath) {
    return Response.json(
      {
        error: 'Missing required parameters: collection, documentId, locale, fieldPath',
      },
      { status: 400 },
    )
  }

  try {
    const result = await req.payload.find({
      collection: 'translation-exclusions',
      where: {
        and: [
          { collection: { equals: collection as string } },
          { documentId: { equals: documentId as string } },
          { locale: { equals: locale as string } },
        ],
      },
      limit: 1,
    })

    if (result.docs.length > 0) {
      const exclusion = result.docs[0] as any
      const excludedPaths = exclusion.excludedPaths?.map((item: any) => item.path) || []
      const isExcluded = excludedPaths.includes(fieldPath as string)

      return Response.json({
        isExcluded,
        excludedPaths,
      })
    }

    return Response.json({
      isExcluded: false,
      excludedPaths: [],
    })
  } catch (error) {
    req.payload.logger.error('Error checking exclusion status:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST endpoint to toggle exclusion for a field
 */
export const toggleExclusion = async (req: PayloadRequest): Promise<Response> => {
  const { collection, documentId, locale, fieldPath, exclude } = req.data || {}

  if (!collection || !documentId || !locale || !fieldPath || exclude === undefined) {
    return Response.json(
      {
        error: 'Missing required parameters: collection, documentId, locale, fieldPath, exclude',
      },
      { status: 400 },
    )
  }

  try {
    // Find existing exclusion record
    const result = await req.payload.find({
      collection: 'translation-exclusions',
      where: {
        and: [
          { collection: { equals: collection } },
          { documentId: { equals: documentId } },
          { locale: { equals: locale } },
        ],
      },
      limit: 1,
    })

    let currentExcludedPaths: string[] = []

    if (result.docs.length > 0) {
      const exclusion = result.docs[0] as any
      currentExcludedPaths = exclusion.excludedPaths?.map((item: any) => item.path) || []
    }

    // Update excluded paths
    if (exclude) {
      // Add path if not already excluded
      if (!currentExcludedPaths.includes(fieldPath)) {
        currentExcludedPaths.push(fieldPath)
      }
    } else {
      // Remove path from exclusions
      currentExcludedPaths = currentExcludedPaths.filter((path) => path !== fieldPath)
    }

    const exclusionsData = {
      collection,
      documentId,
      locale,
      excludedPaths: currentExcludedPaths.map((path) => ({ path })),
    }

    if (result.docs.length > 0) {
      // Update existing record
      await req.payload.update({
        collection: 'translation-exclusions',
        id: result.docs[0].id,
        data: exclusionsData,
      })
    } else {
      // Create new record
      await req.payload.create({
        collection: 'translation-exclusions',
        data: exclusionsData,
      })
    }

    return Response.json({
      success: true,
      isExcluded: exclude,
      excludedPaths: currentExcludedPaths,
    })
  } catch (error) {
    req.payload.logger.error('Error toggling exclusion:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
