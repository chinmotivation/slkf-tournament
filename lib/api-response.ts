import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

// ─── Standard API response envelope ──────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  data: T
  message?: string
}

export interface ApiError {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

// ─── Response helpers ─────────────────────────────────────────────────────────

export function ok<T>(data: T, message?: string): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data, ...(message && { message }) }, { status: 200 })
}

export function created<T>(data: T, message?: string): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data, ...(message && { message }) }, { status: 201 })
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

export function badRequest(message: string, fields?: Record<string, string>): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: 'BAD_REQUEST', message, ...(fields && { fields }) } },
    { status: 400 }
  )
}

export function unauthorized(message = 'Authentication required.'): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message } },
    { status: 401 }
  )
}

export function forbidden(message = 'You do not have permission to perform this action.'): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: 'FORBIDDEN', message } },
    { status: 403 }
  )
}

export function notFound(entity = 'Record'): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: 'NOT_FOUND', message: `${entity} not found.` } },
    { status: 404 }
  )
}

export function conflict(message: string, code = 'CONFLICT'): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code, message } },
    { status: 409 }
  )
}

export function validationError(error: ZodError): NextResponse<ApiError> {
  const fields: Record<string, string> = {}
  error.issues.forEach(err => {
    const path = err.path.join('.')
    fields[path] = err.message
  })
  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'One or more fields are invalid.',
        fields,
      },
    },
    { status: 400 }
  )
}

export function serverError(message = 'An unexpected error occurred. Please try again.'): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: 'INTERNAL_SERVER_ERROR', message } },
    { status: 500 }
  )
}

// ─── Route handler wrapper ────────────────────────────────────────────────────
// Wraps any async route handler and converts uncaught errors to 500 responses.

export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof ZodError) {
        return validationError(error)
      }
      console.error('[API Error]', error)
      return serverError()
    }
  }
}
