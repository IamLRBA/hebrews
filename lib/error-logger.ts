/**
 * Centralized error logging for production. Captures context (staffId, terminalId, path)
 * and does not expose internal details to clients.
 */

export interface ErrorLogContext {
  staffId?: string | null
  terminalId?: string | null
  path?: string | null
  method?: string | null
}

/**
 * Log an unexpected error with context. In production, avoid logging full stack to
 * client-facing responses; use this for server-side logging only.
 */
export function logError(error: unknown, context?: ErrorLogContext): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  const payload = {
    message,
    ...(context?.staffId != null && { staffId: context.staffId }),
    ...(context?.terminalId != null && { terminalId: context.terminalId }),
    ...(context?.path != null && { path: context.path }),
    ...(context?.method != null && { method: context.method }),
    ...(process.env.NODE_ENV === 'development' && stack && { stack }),
  }
  console.error('[POS Error]', JSON.stringify(payload))
}
