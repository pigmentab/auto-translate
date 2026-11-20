import type { Endpoint } from 'payload'

type OpenAIModel = {
  id: string
  created?: number
  object?: string
  owned_by?: string
}

type ModelOption = { label: string; value: string }

type CatalogModalities = {
  input?: string[]
  output?: string[]
}

type CatalogModel = {
  id?: string
  modalities?: CatalogModalities
}

const OPENAI_MODELS_CACHE_TTL_MS = 10 * 60 * 1000
const CATALOG_CACHE_TTL_MS = 60 * 60 * 1000
const MODELS_DEV_CATALOG_URL = 'https://models.dev/api.json'

/**
 * Last-resort name filter when models.dev has no entry for an OpenAI id.
 * Prefer modality metadata from the catalog; do not grow this unless needed.
 */
const NON_CHAT_MODEL =
  /(embedding|whisper|tts|dall-e|realtime|audio|image|moderation|transcribe|search-preview|search-api|codex|sora|babbage|davinci|computer-use|deep-research|gpt-oss|omni-moderation|voice|speech|gpt-live|\blive\b)/i

let modelsCache: { models: ModelOption[]; expiresAt: number } | null = null
let modelsInflight: Promise<ModelOption[]> | null = null

let catalogCache: { byId: Map<string, CatalogModel>; expiresAt: number } | null = null
let catalogInflight: Promise<Map<string, CatalogModel>> | null = null

export function isChatCapableModel(id: string): boolean {
  if (!id || NON_CHAT_MODEL.test(id)) return false
  return /^(gpt-|o[1-9]|chatgpt-)/i.test(id)
}

/**
 * GPT-5+ / GPT-6+ and o-series reject custom temperature at default reasoning effort.
 * Sending other values returns 400 from OpenAI.
 */
export function supportsCustomTemperature(model: string): boolean {
  if (!model) return true
  if (/^o[1-9]/i.test(model)) return false
  if (/^gpt-([5-9]|\d{2,})/i.test(model)) return false
  return true
}

/** Text-in / text-out only — drop voice, realtime, audio, embedding, etc. */
export function isTextTranslationCatalogModel(entry: CatalogModel | null | undefined): boolean {
  if (!entry?.modalities) return false
  const input = entry.modalities.input ?? []
  const output = entry.modalities.output ?? []
  if (!output.includes('text')) return false
  if (output.some((m) => m !== 'text')) return false
  if (input.includes('audio') || input.includes('speech')) return false
  return true
}

function resolveCatalogModel(id: string, byId: Map<string, CatalogModel>): CatalogModel | null {
  const direct = byId.get(id)
  if (direct) return direct

  // gpt-4o-2024-11-20 → gpt-4o
  const withoutDate = id.replace(/-\d{4}-\d{2}-\d{2}$/, '')
  if (withoutDate !== id) {
    const base = byId.get(withoutDate)
    if (base) return base
  }

  return null
}

async function fetchModelsDevCatalog(): Promise<Map<string, CatalogModel>> {
  const now = Date.now()
  if (catalogCache && catalogCache.expiresAt > now) {
    return catalogCache.byId
  }
  if (catalogInflight) return catalogInflight

  catalogInflight = (async () => {
    const res = await fetch(MODELS_DEV_CATALOG_URL, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`models.dev ${res.status}`)
    }

    const body = (await res.json()) as {
      openai?: { models?: Record<string, CatalogModel> }
    }
    const raw = body.openai?.models ?? {}
    const byId = new Map<string, CatalogModel>()
    for (const [id, entry] of Object.entries(raw)) {
      byId.set(id, entry)
      if (entry?.id && entry.id !== id) byId.set(entry.id, entry)
    }

    catalogCache = { byId, expiresAt: Date.now() + CATALOG_CACHE_TTL_MS }
    return byId
  })().finally(() => {
    catalogInflight = null
  })

  return catalogInflight
}

/**
 * Keep models that models.dev marks as text→text (no audio).
 * If catalog lookup misses, fall back to the name heuristic so brand-new
 * chat models still appear before the catalog updates.
 */
export function filterTranslationModels(
  models: OpenAIModel[],
  catalog: Map<string, CatalogModel>,
): OpenAIModel[] {
  return models.filter((model) => {
    if (typeof model?.id !== 'string' || !isChatCapableModel(model.id)) return false

    const catalogEntry = resolveCatalogModel(model.id, catalog)
    if (catalogEntry) {
      return isTextTranslationCatalogModel(catalogEntry)
    }

    // Unknown to catalog — name heuristic already applied via isChatCapableModel
    return true
  })
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
  const listed = body.data ?? []

  let catalog = new Map<string, CatalogModel>()
  try {
    catalog = await fetchModelsDevCatalog()
  } catch {
    // Catalog is best-effort; name filter still applies via isChatCapableModel
  }

  return filterTranslationModels(listed, catalog)
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
