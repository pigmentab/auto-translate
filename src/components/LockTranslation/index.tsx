'use client'

import { useForm, useFormFields } from '@payloadcms/ui'
import React, { useCallback, useEffect } from 'react'

import './style.css'

/**
 * Lock/unlock Translation Settings in the form only.
 * Do not POST unlock to the API — that bumps updatedAt and trips Payload's
 * "Document modified" stale modal on the next keystroke. Field access allows
 * the save when lockTranslationSettings is false in the request; beforeChange
 * re-locks on the same write.
 */
export const LockTranslation: React.FC = () => {
  const lockField = useFormFields(([fields]) => fields?.lockTranslationSettings)
  const { dispatchFields } = useForm()
  const isLocked = Boolean(lockField?.value ?? true)

  // Model select uses form lock state in OpenAiModelField (react-select).
  const applyLockStateToFields = useCallback((locked: boolean) => {
    const fieldsToLock = ['systemPrompt', 'translationRules', 'temperature', 'maxTokens']

    fieldsToLock.forEach((fieldPath) => {
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

  useEffect(() => {
    const timer = setTimeout(() => {
      applyLockStateToFields(isLocked)
    }, 100)

    return () => clearTimeout(timer)
  }, [isLocked, applyLockStateToFields])

  const toggleLock = useCallback(() => {
    const newLockState = !isLocked

    dispatchFields({
      type: 'UPDATE',
      path: 'lockTranslationSettings',
      value: newLockState,
    })

    applyLockStateToFields(newLockState)
  }, [isLocked, dispatchFields, applyLockStateToFields])

  return (
    <div className="translation-settings-lock-container">
      <button
        className={`translation-settings-lock-button ${isLocked ? 'locked' : 'unlocked'}`}
        onClick={toggleLock}
        title={
          isLocked
            ? 'Settings are locked to prevent accidental changes. Click to unlock and edit.'
            : 'Settings are unlocked. Click to lock, or save to lock automatically.'
        }
        type="button"
      >
        <span className="translation-settings-lock-icon">{isLocked ? '🔒' : '🔓'}</span>
        <span className="translation-settings-lock-label">
          {isLocked ? 'Unlock Settings' : 'Lock Settings'}
        </span>
      </button>
    </div>
  )
}
