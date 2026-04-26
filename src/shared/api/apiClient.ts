import { env } from '@/shared/config/env'

type HttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'

type RequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  body?: unknown
  method?: HttpMethod
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json() as Promise<unknown>
  }

  const text = await response.text()
  return text.length > 0 ? text : null
}

function getApiErrorMessage(status: number, data: unknown) {
  if (typeof data === 'string' && data.trim().length > 0) {
    return data
  }

  if (isRecord(data)) {
    const candidate = [data.detail, data.message, data.error].find(
      (value) => typeof value === 'string' && value.trim().length > 0,
    )

    if (typeof candidate === 'string') {
      return candidate
    }
  }

  return `Request failed with status ${status}.`
}

export class ApiError extends Error {
  readonly data: unknown
  readonly status: number

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

class ApiClient {
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private buildUrl(path: string) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    if (/^https?:\/\//i.test(this.baseUrl)) {
      return new URL(normalizedPath, `${this.baseUrl}/`).toString()
    }

    const normalizedBase =
      this.baseUrl.length > 0 && this.baseUrl !== '/'
        ? this.baseUrl.replace(/\/+$/, '')
        : ''

    return `${normalizedBase}${normalizedPath}`
  }

  async request<TResponse>(path: string, options: RequestOptions = {}) {
    const { body, headers, method = 'GET', ...rest } = options

    const response = await fetch(this.buildUrl(path), {
      ...rest,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      method,
    })

    const data = await parseResponseBody(response)

    if (!response.ok) {
      throw new ApiError(getApiErrorMessage(response.status, data), response.status, data)
    }

    return data as TResponse
  }

  get<TResponse>(path: string, options?: Omit<RequestInit, 'body' | 'method'>) {
    return this.request<TResponse>(path, { ...options, method: 'GET' })
  }

  post<TResponse, TBody>(
    path: string,
    body: TBody,
    options?: Omit<RequestInit, 'body' | 'method'>,
  ) {
    return this.request<TResponse>(path, { ...options, body, method: 'POST' })
  }
}

export const apiClient = new ApiClient(env.apiBaseUrl)
