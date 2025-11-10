import type { GlobalConfig } from 'payload'

export const getTranslationSettingsGlobal = (
  slug: string = 'translation-settings',
): GlobalConfig => ({
  slug,
  access: {
    read: () => true,
    update: ({ req }) => {
      // Only admins can update translation settings
      return Boolean(req.user)
    },
  },
  admin: {
    description: 'Configure translation settings including the system prompt and model parameters',
  },
  fields: [
    {
      name: 'systemPrompt',
      type: 'textarea',
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
      admin: {
        description: 'The OpenAI model to use for translations (e.g., gpt-4o, gpt-4o-mini)',
      },
      defaultValue: 'gpt-4o',
      label: 'Model',
      required: true,
    },
    {
      name: 'temperature',
      type: 'number',
      admin: {
        description:
          'Controls randomness in translation (0.0-2.0). Lower values are more deterministic.',
        step: 0.1,
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
      admin: {
        description: 'Maximum tokens for the response. Leave empty for automatic.',
      },
      label: 'Max Tokens',
      min: 1,
    },
  ],
  label: 'Translation Settings',
})
