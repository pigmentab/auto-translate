'use client'

import { useForm, useFormFields } from '@payloadcms/ui'
import React, { useCallback, useEffect, useState } from 'react'

import { updateLockTranslationSettingsField } from './actions/lockTranslations.js'
import './style.css'

/**
 * Component that provides lock/unlock functionality for translation settings
 * - Fields are locked by default (read-only)
 * - User must click "Unlock" to edit
 * - After saving, fields automatically lock again
 * - Updates the hidden lockTranslationSettings checkbox field to enable server-side access control
 */
export const LockTranslation: React.FC = () => {
  const lockField = useFormFields(([fields]) => fields?.lockTranslationSettings)
  const { dispatchFields } = useForm()
  const isLocked = Boolean(lockField?.value ?? true)
  const [isLoading, setIsLoading] = useState(false)

  // Apply lock state to fields by directly manipulating their disabled state
  const applyLockStateToFields = useCallback((locked: boolean) => {
    const fieldsToLock = ['systemPrompt', 'translationRules', 'model', 'temperature', 'maxTokens']

    fieldsToLock.forEach((fieldPath) => {
      // Find the input/textarea elements for this field
      const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        `[name="${fieldPath}"], textarea[id*="${fieldPath}"], input[id*="${fieldPath}"]`,
      )

      inputs.forEach((input) => {
        if (locked) {
          input.setAttribute('disabled', 'true')
        } else {
          input.removeAttribute('disabled')
        }
      })
    })
  }, [])

  // Apply initial lock state when component mounts or lock state changes
  useEffect(() => {
    // Small delay to ensure form fields are rendered
    const timer = setTimeout(() => {
      applyLockStateToFields(isLocked)
    }, 100)

    return () => clearTimeout(timer)
  }, [isLocked, applyLockStateToFields])

  const toggleLock = useCallback(async () => {
    const newLockState = !isLocked
    setIsLoading(true)

    try {
      const result = await updateLockTranslationSettingsField(newLockState)

      if (result.success) {
        // Update the lockTranslationSettings field value
        dispatchFields({
          type: 'UPDATE',
          path: 'lockTranslationSettings',
          value: result.isLocked,
        })

        // Apply lock state to fields
        applyLockStateToFields(result.isLocked)

        // eslint-disable-next-line no-console
        console.log('[LockTranslation] Updated successfully:', result.isLocked)
      } else {
        // eslint-disable-next-line no-console
        console.error('[LockTranslation] Failed to update')
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[LockTranslation] Error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLocked, dispatchFields, applyLockStateToFields])

  return (
    <div className="translation-settings-lock-container">
      <button
        className={`translation-settings-lock-button ${isLocked ? 'locked' : 'unlocked'}`}
        disabled={isLoading}
        onClick={toggleLock}
        title={
          isLocked
            ? '🔒 Settings are locked to prevent accidental changes. Click to unlock and edit.'
            : '🔓 Settings are unlocked. Click to lock after saving your changes.'
        }
        type="button"
      >
        <span className="translation-settings-lock-icon">
          {isLoading ? '⏳' : isLocked ? '🔒' : '🔓'}
        </span>
        <span className="translation-settings-lock-label">
          {isLoading ? 'Updating...' : isLocked ? 'Unlock Settings' : 'Lock Settings'}
        </span>
      </button>
    </div>
  )
}
