import type { Endpoint } from 'payload'

type OpenAIModel = {
  id: string
  created?: number
  object?: string
  owned_by?: string
}

type ModelOption = { label: string; value: string }

const OPENAI_MODELS_CACHE_TTL_MS = 10 * 60 * 1000

const NON_CHAT_MODEL =
  /(embedding|whisper|tts|dall-e|realtime|audio|image|moderation|transcribe|search-preview|codex|sora|babbage|davinci|computer-use|deep-research|gpt-oss|omni-moderation)/i

let modelsCache: { models: ModelOption[]; expiresAt: number } | null = null
let modelsInflight: Promise<ModelOption[]> | null = null

export function isChatCapableModel(id: string): boolean {
  if (!id || NON_CHAT_MODEL.test(id)) return false
  return /^(gpt-|o[1-9]|chatgpt-)/i.test(id)
}

/** GPT-5+ and o-series only accept the default temperature (1). */
export function supportsCustomTemperature(model: string): boolean {
  if (!model) return true
  if (/^o[1-9]/i.test(model)) return false
  if (/^gpt-5/i.test(model)) return false
  return true
}

async function fetchChatCapableModels(apiKey: string): Promise<ModelOption[]> {
  const openaiRes = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!openaiRes.ok) {
    const errText = await openaiRes.text()
    throw new Error(`OpenAI API ${openaiRes.status}: ${errText.slice(0, 200)}`)
  }

  const body = (await openaiRes.json()) as { data?: OpenAIModel[] }
  return (body.data ?? [])
    .filter((model) => typeof model?.id === 'string' && isChatCapableModel(model.id))
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0) || a.id.localeCompare(b.id))
    .map((model) => ({
      label: model.id,
      value: model.id,
    }))
}

async function getCachedChatCapableModels(apiKey: string): Promise<ModelOption[]> {
  const now = Date.now()
  if (modelsCache && modelsCache.expiresAt > now) {
    return modelsCache.models
  }

  if (modelsInflight) return modelsInflight

  modelsInflight = fetchChatCapableModels(apiKey)
    .then((models) => {
      modelsCache = { models, expiresAt: Date.now() + OPENAI_MODELS_CACHE_TTL_MS }
      return models
    })
    .finally(() => {
      modelsInflight = null
    })

  return modelsInflight
}

export const listOpenAiModelsEndpoint: Endpoint = {
  path: '/openai-models',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY is not set' }, { status: 500 })
    }

    try {
      const models = await getCachedChatCapableModels(apiKey)
      return Response.json({ models })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.startsWith('OpenAI API ')) {
        return Response.json({ error: message }, { status: 502 })
      }
      req.payload.logger.error({ err }, '[auto-translate] Failed to list OpenAI models')
      return Response.json({ error: message }, { status: 500 })
    }
  },
}
