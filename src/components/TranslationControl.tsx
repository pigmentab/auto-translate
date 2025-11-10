'use client'

import { useDocumentInfo, useLocale } from '@payloadcms/ui'
import React, { useCallback, useEffect, useState } from 'react'

import './TranslationControl.css'

type TranslationControlProps = {
  collectionSlug?: string
  defaultLocale: string
  fieldPath: string
}

/**
 * UI component that allows users to toggle "do not translate" for specific fields
 * Only shows on secondary locales (not the default locale)
 */
export const TranslationControl: React.FC<TranslationControlProps> = ({
  collectionSlug,
  defaultLocale,
  fieldPath,
}) => {
  const { id, collectionSlug: docCollectionSlug } = useDocumentInfo()
  const { code: currentLocale } = useLocale()
  const [isExcluded, setIsExcluded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Use collectionSlug from props or from document context
  const effectiveCollectionSlug = collectionSlug || docCollectionSlug

  // Don't show on default locale - you can only lock fields in secondary locales
  if (currentLocale === defaultLocale) {
    return null
  }

  // Load exclusion state on mount and when locale changes
  useEffect(() => {
    if (!id || !effectiveCollectionSlug) {
      return
    }

    const loadExclusionState = async () => {
      try {
        // Build query for this specific locale
        const whereQuery = {
          and: [
            { collection: { equals: effectiveCollectionSlug } },
            { documentId: { equals: id } },
            { locale: { equals: currentLocale } },
          ],
        }

        console.log('[TranslationControl] Loading exclusion state for:', {
          collection: effectiveCollectionSlug,
          documentId: id,
          fieldPath,
          locale: currentLocale,
        })

        const queryString = new URLSearchParams({
          limit: '1',
          where: JSON.stringify(whereQuery),
        }).toString()

        const response = await fetch(`/api/translation-exclusions?${queryString}`)

        if (response.ok) {
          const data = await response.json()

          if (data.docs && data.docs.length > 0) {
            const exclusion = data.docs[0]

            // IMPORTANT: Double-check the locale matches
            if (exclusion.locale === currentLocale) {
              const excludedPaths = exclusion.excludedPaths?.map((item: any) => item.path) || []
              const isFieldExcluded = excludedPaths.includes(fieldPath)

              console.log('[TranslationControl] Loaded exclusions for', currentLocale, ':', {
                excludedPaths,
                fieldPath,
                isFieldExcluded,
              })

              setIsExcluded(isFieldExcluded)
            } else {
              console.warn('[TranslationControl] Locale mismatch in loaded exclusion!', {
                expected: currentLocale,
                got: exclusion.locale,
              })
              setIsExcluded(false)
            }
          } else {
            // No exclusions found for this locale - that's fine
            console.log('[TranslationControl] No exclusions found for', currentLocale)
            setIsExcluded(false)
          }
        }
      } catch (error) {
        console.error('[TranslationControl] Failed to load exclusion state:', error)
      }
    }

    loadExclusionState()
  }, [id, effectiveCollectionSlug, currentLocale, fieldPath])

  const toggleExclusion = useCallback(async () => {
    if (!id || !effectiveCollectionSlug) {
      return
    }

    setIsLoading(true)
    try {
      // Build query parameters for Payload REST API
      const whereQuery = {
        and: [
          { collection: { equals: effectiveCollectionSlug } },
          { documentId: { equals: id } },
          { locale: { equals: currentLocale } },
        ],
      }

      // Debug: Log the query we're making
      console.log('[TranslationControl] Fetching exclusions for:', {
        collection: effectiveCollectionSlug,
        documentId: id,
        fieldPath,
        locale: currentLocale,
      })

      // Properly format the where clause for Payload's REST API
      const queryString = new URLSearchParams({
        limit: '1',
        where: JSON.stringify(whereQuery),
      }).toString()

      const findResponse = await fetch(`/api/translation-exclusions?${queryString}`)

      let currentExcludedPaths: string[] = []
      let existingId: null | string = null

      if (findResponse.ok) {
        const data = await findResponse.json()
        console.log('[TranslationControl] Found exclusions:', data.docs)

        if (data.docs && data.docs.length > 0) {
          const exclusion = data.docs[0]

          // IMPORTANT: Verify this exclusion is for the current locale
          if (exclusion.locale === currentLocale) {
            existingId = exclusion.id
            currentExcludedPaths = exclusion.excludedPaths?.map((item: any) => item.path) || []
            console.log(
              '[TranslationControl] Current excluded paths for',
              currentLocale,
              ':',
              currentExcludedPaths,
            )
          } else {
            console.warn('[TranslationControl] Found exclusion for wrong locale!', {
              expected: currentLocale,
              got: exclusion.locale,
            })
          }
        }
      }

      // Update excluded paths for THIS locale only
      if (!isExcluded) {
        // Add path if not already excluded
        if (!currentExcludedPaths.includes(fieldPath)) {
          currentExcludedPaths.push(fieldPath)
        }
      } else {
        // Remove path from exclusions
        currentExcludedPaths = currentExcludedPaths.filter((path) => path !== fieldPath)
      }

      // Create the exclusion data - ALWAYS include the current locale
      const exclusionsData = {
        collection: effectiveCollectionSlug,
        documentId: id,
        excludedPaths: currentExcludedPaths.map((path) => ({ path })),
        locale: currentLocale, // Ensure this is the CURRENT locale
      }

      console.log('[TranslationControl] Saving exclusions:', exclusionsData)

      // Update or create record using Payload's REST API
      if (existingId) {
        const updateResponse = await fetch(`/api/translation-exclusions/${existingId}`, {
          body: JSON.stringify(exclusionsData),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'PATCH',
        })

        if (updateResponse.ok) {
          const result = await updateResponse.json()
          console.log('[TranslationControl] Updated exclusions:', result.doc)
        }
      } else {
        const createResponse = await fetch('/api/translation-exclusions', {
          body: JSON.stringify(exclusionsData),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        })

        if (createResponse.ok) {
          const result = await createResponse.json()
          console.log('[TranslationControl] Created exclusions:', result.doc)
        }
      }

      setIsExcluded(!isExcluded)
    } catch (error) {
      console.error('[TranslationControl] Error toggling exclusion:', error)
    } finally {
      setIsLoading(false)
    }
  }, [id, effectiveCollectionSlug, currentLocale, fieldPath, isExcluded])

  // Don't show on create (no id yet)
  if (!id) {
    return null
  }

  return (
    <div className={`translation-control ${isExcluded ? 'is-excluded' : ''}`}>
      <button
        className="translation-control__button"
        disabled={isLoading}
        onClick={toggleExclusion}
        title={
          isExcluded
            ? 'This field is locked and will not be auto-translated from the default language'
            : 'Click to lock this field from auto-translation'
        }
        type="button"
      >
        <span className="translation-control__icon">{isExcluded ? '🔒' : '🌐'}</span>
        <span className="translation-control__label">
          {isExcluded ? 'Locked' : 'Auto-translate'}
        </span>
      </button>
      {isExcluded && (
        <span className="translation-control__status">
          This field will not be overwritten when the default language version is updated.
        </span>
      )}
    </div>
  )
}
