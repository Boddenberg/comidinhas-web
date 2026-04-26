import { ApiError } from '@/shared/api/apiClient'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  if (isRecord(error) && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message
  }

  return fallbackMessage
}
