'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

import './TranslationSettingsLock.css'

const DEBUG = false // Set to true for debugging

/**
 * Component that provides lock/unlock functionality for translation settings
 * - Fields are locked by default (read-only)
 * - User must click "Unlock" to edit
 * - After saving, fields automatically lock again
 */
export const TranslationSettingsLock: React.FC = () => {
  const [isLocked, setIsLocked] = useState(true)
  const formRef = useRef<HTMLFormElement | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Find form element (memoized selector logic)
  const findForm = useCallback((): HTMLFormElement | null => {
    if (formRef.current && document.contains(formRef.current)) {
      return formRef.current
    }

    const formElement =
      document.querySelector('form[id*="translation-settings"]') ||
      document.querySelector('form[id*="Global"]') ||
      document.querySelector('form.render-fields') ||
      document.querySelector('form')

    const form = formElement as HTMLFormElement | null

    if (form) {
      formRef.current = form
    }

    return form
  }, [])

  // Apply lock/unlock state to all form fields (optimized with caching)
  const applyLockState = useCallback(() => {
    const form = findForm()

    if (!form) {
      if (DEBUG) {
        console.warn('[TranslationSettingsLock] No form found')
      }
      return
    }

    // Find all input fields - using more efficient selector
    const inputs = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input[type="text"], input[type="number"], textarea',
    )

    if (DEBUG) {
      console.log(
        '[TranslationSettingsLock] Applying lock state:',
        isLocked,
        'to',
        inputs.length,
        'inputs',
      )
    }

    // Batch DOM updates for better performance
    inputs.forEach((input) => {
      // Skip if this is the lock control itself
      if (input.closest('.translation-settings-lock-container')) {
        return
      }

      // Use single operation to update multiple attributes
      if (isLocked) {
        input.setAttribute('readonly', 'true')
        input.setAttribute('disabled', 'true')
        input.classList.add('translation-settings-locked')
      } else {
        input.removeAttribute('readonly')
        input.removeAttribute('disabled')
        input.classList.remove('translation-settings-locked')
      }
    })

    // Update the save button state
    const saveButtonElement = document.querySelector('button#action-save')
    const saveButton = saveButtonElement as HTMLButtonElement | null

    if (saveButton) {
      if (isLocked) {
        saveButton.setAttribute('disabled', 'true')
        saveButton.classList.add('translation-settings-save-locked')
      } else {
        saveButton.removeAttribute('disabled')
        saveButton.classList.remove('translation-settings-save-locked')
      }
    }
  }, [isLocked, findForm])

  // Debounced version of applyLockState for MutationObserver
  const debouncedApplyLockState = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      applyLockState()
    }, 100) // 100ms debounce
  }, [applyLockState])

  // Setup MutationObserver for form changes
  useEffect(() => {
    // Initial application
    const initialTimeout = setTimeout(applyLockState, 100)

    // Setup observer to watch for dynamic field additions
    const form = findForm()

    if (form) {
      observerRef.current = new MutationObserver(debouncedApplyLockState)

      // Only observe the form element, not the entire body (much more efficient)
      observerRef.current.observe(form, {
        attributes: false, // Don't watch attribute changes, only structure
        childList: true,
        subtree: true,
      })

      if (DEBUG) {
        console.log('[TranslationSettingsLock] MutationObserver attached to form')
      }
    }

    return () => {
      clearTimeout(initialTimeout)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [isLocked, applyLockState, debouncedApplyLockState, findForm])

  // Listen for form submission to auto-lock after save
  useEffect(() => {
    const form = findForm()

    if (!form) {
      if (DEBUG) {
        console.warn('[TranslationSettingsLock] No form found for submit listener')
      }
      return
    }

    const handleSubmit = () => {
      if (DEBUG) {
        console.log('[TranslationSettingsLock] Form submitted, will auto-lock in 2s')
      }

      // Lock after a delay to ensure save completes
      setTimeout(() => {
        if (DEBUG) {
          console.log('[TranslationSettingsLock] Auto-locking after save')
        }
        setIsLocked(true)
      }, 2000)
    }

    form.addEventListener('submit', handleSubmit)
    if (DEBUG) {
      console.log('[TranslationSettingsLock] Submit listener attached')
    }

    return () => {
      form.removeEventListener('submit', handleSubmit)
      if (DEBUG) {
        console.log('[TranslationSettingsLock] Submit listener removed')
      }
    }
  }, [findForm])

  const toggleLock = useCallback(() => {
    if (DEBUG) {
      console.log(
        '[TranslationSettingsLock] Toggle clicked, changing from',
        isLocked,
        'to',
        !isLocked,
      )
    }
    setIsLocked((prev) => !prev)
  }, [isLocked])

  return (
    <div className="translation-settings-lock-container">
      <button
        className={`translation-settings-lock-button ${isLocked ? 'locked' : 'unlocked'}`}
        onClick={toggleLock}
        title={
          isLocked
            ? '🔒 Settings are locked to prevent accidental changes. Click to unlock and edit.'
            : '🔓 Settings are unlocked. Click to lock after saving your changes.'
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
