// ---------------------------------------------------------------------------
// AI provider registry + OpenAI-compatible chat client.
//
// Users bring their own API keys (OpenRouter, xAI Grok, Orca Router, or any
// OpenAI-compatible endpoint). Keys are stored ONLY in localStorage and are
// sent exclusively to the provider the user selected — never to AstroClean
// servers (there are none).
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'astroclean:providers'

/** Well-known providers, pre-filled so users only need to paste a key. */
export const PROVIDER_PRESETS = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    hint: 'One key for hundreds of models — openrouter.ai',
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-4.6',
    hint: 'Grok models from xAI — console.x.ai',
  },
  {
    id: 'orcarouter',
    name: 'Orca Router',
    baseUrl: 'https://api.orcarouter.ai/v1',
    model: 'orcarouter/auto',
    hint: 'Meta-router: pass orcarouter/auto or any routed model — orcarouter.ai',
  },
  {
    id: 'custom',
    name: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    model: '',
    hint: 'Any endpoint implementing POST /chat/completions',
  },
]

/**
 * Normalises a base URL. Tolerates a trailing slash or a full
 * `/chat/completions` URL pasted by mistake.
 */
export function normalizeBaseUrl(raw) {
  let url = String(raw ?? '').trim().replace(/\/+$/, '')
  url = url.replace(/\/chat\/completions$/i, '')
  url = url.replace(/\/v1\/chat\/completions$/i, '/v1')
  return url
}

/** Loads saved providers from localStorage. */
export function loadProviders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((p) => p && typeof p === 'object' && typeof p.name === 'string')
      .map((p) => ({
        id: p.id,
        name: p.name,
        baseUrl: p.baseUrl ?? '',
        model: p.model ?? '',
        apiKey: p.apiKey ?? '',
        active: Boolean(p.active),
      }))
  } catch {
    return []
  }
}

/** Persists providers to localStorage. */
export function saveProviders(providers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers))
  } catch {
    // Storage full or unavailable — non-fatal, providers just won't persist.
  }
}

/** Returns the provider to use for AI ops (active first, else first keyed). */
export function activeProvider(providers) {
  return (
    providers.find((p) => p.active && p.apiKey?.trim()) ??
    providers.find((p) => p.apiKey?.trim()) ??
    null
  )
}

/** Masks a key for display: sk-…abcd */
export function maskKey(key) {
  const k = String(key ?? '')
  if (k.length <= 8) return '••••'
  return `${k.slice(0, 3)}…${k.slice(-4)}`
}

function describeHttpError(status, body) {
  const snippet = String(body ?? '').slice(0, 140)
  switch (status) {
    case 401:
      return `Invalid API key (401) — check the key in Settings. ${snippet}`
    case 402:
      return `Insufficient balance / payment required (402). ${snippet}`
    case 403:
      return `Access denied (403) — the key may lack access to this model. ${snippet}`
    case 404:
      return `Endpoint or model not found (404) — check the base URL and model name. ${snippet}`
    case 429:
      return `Rate limited (429) — try fewer parallel requests or a different model. ${snippet}`
    default:
      if (status >= 500) return `Provider error (${status}). ${snippet}`
      return `Request failed (${status}). ${snippet}`
  }
}

/**
 * Calls an OpenAI-compatible /chat/completions endpoint.
 *
 * @param {object} provider { baseUrl, apiKey, model }
 * @param {{ system?: string, user: string, temperature?: number, maxTokens?: number, signal?: AbortSignal }} opts
 * @returns {Promise<string>} The assistant text.
 */
const MAX_RETRIES = 3

/**
 * Sleep helper that respects AbortSignal.
 */
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }, { once: true })
  })
}

export async function chatComplete(provider, opts = {}) {
  const { system, user, temperature = 0.1, maxTokens = 600, signal } = opts
  const base = normalizeBaseUrl(provider?.baseUrl)
  if (!base || !provider?.apiKey?.trim() || !provider?.model?.trim()) {
    throw new Error('Provider is missing a base URL, API key, or model.')
  }

  const messages = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: user })

  let lastError = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: provider.model.trim(),
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal,
      })
    } catch (err) {
      if (err?.name === 'AbortError') throw err
      // Network errors: retry with backoff.
      lastError = new Error(`Network error — could not reach ${base}. ${err?.message ?? ''}`)
      if (attempt < MAX_RETRIES) {
        await sleep(Math.min(1000 * 2 ** attempt, 8000), signal).catch(() => {})
        continue
      }
      throw lastError
    }

    if (res.ok) {
      const data = await res.json().catch(() => null)
      const content = data?.choices?.[0]?.message?.content
      if (typeof content === 'string' && content.trim() !== '') {
        return content
      }
      // Empty response: treat as a transient failure, retry.
      lastError = new Error('Provider returned an empty response.')
      if (attempt < MAX_RETRIES) {
        await sleep(Math.min(1000 * 2 ** attempt, 8000), signal).catch(() => {})
        continue
      }
      throw lastError
    }

    // Retryable status codes: 429 (rate limit) and 5xx (server errors).
    const retryable = res.status === 429 || res.status >= 500
    const body = await res.text().catch(() => '')
    lastError = new Error(describeHttpError(res.status, body))

    if (retryable && attempt < MAX_RETRIES) {
      // Respect Retry-After header from 429 responses.
      const retryAfter = res.headers?.get('Retry-After')
      const delay = retryAfter
        ? Math.min(Number(retryAfter) * 1000, 15000)
        : Math.min(1000 * 2 ** attempt, 8000)
      await sleep(delay, signal).catch(() => {})
      continue
    }

    throw lastError
  }

  throw lastError ?? new Error('Request failed after retries.')
}

/** Verifies a provider config with a minimal request. */
export async function testProvider(provider) {
  const reply = await chatComplete(provider, {
    system: 'Reply with the single word OK.',
    user: 'ping',
    temperature: 0,
    maxTokens: 4,
  })
  return { ok: /ok/i.test(reply.trim()) }
}
