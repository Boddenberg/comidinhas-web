const fallbackApiBaseUrl = 'http://localhost:8000'

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

export const env = {
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL ?? fallbackApiBaseUrl),
}
