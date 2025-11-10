'use client'

import type { FieldPath } from '../types/index.js'
import React, { useCallback, useEffect, useState } from 'react'
import { useDocumentInfo, useLocale } from '@payloadcms/ui'
import './TranslationControl.css'

type TranslationControlProps = {
  fieldPath: string
  collectionSlug: string
}

/**
 * UI component that allows users to toggle "do not translate" for specific fields
 * Only shows on secondary locales (not the default locale)
 */
export const TranslationControl: React.FC<TranslationControlProps> = ({
  fieldPath,
  collectionSlug,
}) => {
  const { id } = useDocumentInfo()
  const { code: currentLocale } = useLocale()
  const [isExcluded, setIsExcluded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load exclusion state on mount
  useEffect(() => {
    if (!id) return

    const loadExclusionState = async () => {
      try {
        const response = await fetch(
          `/api/translation-exclusions?collection=${collectionSlug}&documentId=${id}&locale=${currentLocale}&fieldPath=${fieldPath}`,
        )

        if (response.ok) {
          const data = await response.json()
          setIsExcluded(data.isExcluded || false)
        }
      } catch (error) {
        console.error('Failed to load exclusion state:', error)
      }
    }

    loadExclusionState()
  }, [id, collectionSlug, currentLocale, fieldPath])

  const toggleExclusion = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/translation-exclusions/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection: collectionSlug,
          documentId: id,
          locale: currentLocale,
          fieldPath,
          exclude: !isExcluded,
        }),
      })

      if (response.ok) {
        setIsExcluded(!isExcluded)
      } else {
        console.error('Failed to toggle exclusion')
      }
    } catch (error) {
      console.error('Error toggling exclusion:', error)
    } finally {
      setIsLoading(false)
    }
  }, [id, collectionSlug, currentLocale, fieldPath, isExcluded])

  // Don't show on create (no id yet)
  if (!id) {
    return null
  }

  return (
    <div className="translation-control">
      <button
        type="button"
        onClick={toggleExclusion}
        disabled={isLoading}
        className={`translation-control__button ${isExcluded ? 'excluded' : ''}`}
        title={
          isExcluded
            ? 'This field will not be auto-translated from the default language'
            : 'This field will be auto-translated from the default language'
        }
      >
        <span className="translation-control__icon">
          {isExcluded ? '🔒' : '🌐'}
        </span>
        <span className="translation-control__label">
          {isExcluded ? 'Translation locked' : 'Auto-translate'}
        </span>
      </button>
      {isExcluded && (
        <p className="translation-control__help">
          This field will not be overwritten when the default language version is updated.
        </p>
      )}
    </div>
  )
}

