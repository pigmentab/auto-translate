/**
 * Client-side function to update the lockTranslationSettings field
 * Makes a fetch request to update the global
 */
export async function updateLockTranslationSettingsField(
  isLocked: boolean,
): Promise<{ isLocked: boolean; success: boolean }> {
  try {
    const response = await fetch('/api/globals/translation-settings', {
      body: JSON.stringify({
        lockTranslationSettings: isLocked,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Failed to update: ${response.statusText}`)
    }

    return {
      isLocked,
      success: true,
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[LockTranslation] Error updating lock state:', error)
    return {
      isLocked: !isLocked,
      success: false,
    }
  }
}
