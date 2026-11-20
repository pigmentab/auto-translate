import type { FieldAccess, GlobalConfig } from 'payload'

import { listOpenAiModelsEndpoint, supportsCustomTemperature } from '../endpoints/listOpenAiModels.js'

/**
 * Settings fields stay locked in the DB until save. Unlock is client-only so we
 * must allow the save when this request itself carries lockTranslationSettings: false.
 */
const canUpdateLockedSettings: FieldAccess = ({ data, doc }) => {
  if (!doc?.lockTranslationSettings) return true
  return data?.lockTranslationSettings === false
}

export const getTranslationSettingsGlobal = (
  slug: string = 'translation-settings',
): GlobalConfig => ({
  slug,
  admin: {
    description: 'Configure translation settings including the system prompt and model parameters',
    group: 'Auto-Translate Settings',
  },
  endpoints: [listOpenAiModelsEndpoint],
  fields: [
    {
      name: 'settingsLock',
      type: 'ui',
      admin: {
        components: {
          Field: '@pigment/auto-translate/client#LockTranslation',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'lockTranslationSettings',
      type: 'checkbox',
      admin: {
        hidden: true,
      },
      defaultValue: true,
    },
    {
      name: 'systemPrompt',
      type: 'textarea',
      access: {
        read: () => true,
        update: canUpdateLockedSettings,
      },
      admin: {
        description:
          'The main instruction for the AI translator. Use {fromLocale} and {toLocale} as placeholders.',
        rows: 3,
      },
      defaultValue: `You are a professional translator. Translate the JSON object values from {fromLocale} to {toLocale}.`,
      label: 'System Prompt',
      required: true,
    },
    {
      name: 'translationRules',
      type: 'textarea',
      access: {
        read: () => true,
        update: canUpdateLockedSettings,
      },
      admin: {
        description:
          "⚠️ Do not edit if you don't know what you are doing. These rules ensure proper JSON translation behavior.",
        rows: 8,
      },
      defaultValue: `Rules:
- Only translate the values, never the keys
- Preserve the exact JSON structure
- Do not translate field names like 'id', 'createdAt', 'updatedAt', etc.
- Maintain formatting, HTML tags, and special characters
- Return only valid JSON without any markdown formatting or code blocks
- If a value is already in the target language or is a proper noun, keep it as is`,
      label: 'Translation Rules',
      required: true,
    },
    {
      name: 'model',
      type: 'text',
      access: {
        read: () => true,
        update: canUpdateLockedSettings,
      },
      admin: {
        components: {
          Field: '@pigment/auto-translate/client#OpenAiModelField',
        },
        description: 'The OpenAI model to use for translations',
      },
      defaultValue: 'gpt-4o',
      label: 'Model',
      required: true,
    },
    {
      name: 'temperature',
      type: 'number',
      access: {
        read: () => true,
        update: canUpdateLockedSettings,
      },
      admin: {
        description:
          'Controls randomness in translation (0.0-2.0). Lower values are more deterministic. Not applied for GPT-5+/GPT-6+ or o-series models.',
        step: 0.1,
        condition: (_data, siblingData) => {
          const model = typeof siblingData?.model === 'string' ? siblingData.model : ''
          return supportsCustomTemperature(model)
        },
      },
      defaultValue: 0.3,
      label: 'Temperature',
      max: 2,
      min: 0,
      required: true,
    },
    {
      name: 'maxTokens',
      type: 'number',
      access: {
        read: () => true,
        update: canUpdateLockedSettings,
      },
      admin: {
        description: 'Maximum tokens for the response. Leave empty for automatic.',
      },
      label: 'Max Tokens',
      min: 1,
    },
  ],
  hooks: {
    // Re-lock in the same write as the settings save. Unlock is client-only so a
    // second updateGlobal is never needed (that used to trip the stale modal).
    beforeChange: [
      ({ data }) => {
        if (!data) return data

        const savingSettings =
          data.systemPrompt !== undefined ||
          data.translationRules !== undefined ||
          data.model !== undefined ||
          data.temperature !== undefined ||
          data.maxTokens !== undefined

        if (!savingSettings) return data

        return {
          ...data,
          lockTranslationSettings: true,
        }
      },
    ],
  },
  label: 'Translation Settings',
})
