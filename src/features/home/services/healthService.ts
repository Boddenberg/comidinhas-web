import { apiClient } from '@/shared/api/apiClient'

export interface HealthResponse {
  detail?: string
  environment?: string
  message?: string
  service?: string
  status?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getHealthMessage(payload: unknown) {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload
  }

  if (isRecord(payload)) {
    const status = typeof payload.status === 'string' ? payload.status : undefined
    const service = typeof payload.service === 'string' ? payload.service : undefined
    const environment = typeof payload.environment === 'string' ? payload.environment : undefined

    if (service && environment && status) {
      return `${service} em ${environment} com status ${status}.`
    }

    const candidate = [payload.message, payload.detail, payload.status].find(
      (value) => typeof value === 'string' && value.trim().length > 0,
    )

    if (typeof candidate === 'string') {
      return candidate
    }
  }

  return 'BFF disponivel e pronto para responder.'
}

export interface HealthCheckResult {
  available: boolean
  message: string
}

export async function checkBackendHealth(): Promise<HealthCheckResult> {
  const payload = await apiClient.get<HealthResponse>('/health')

  return {
    available: true,
    message: getHealthMessage(payload),
  }
}
