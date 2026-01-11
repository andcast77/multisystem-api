import { handleError, ApiError, ErrorCodes } from './errors'

export async function parseRequestBody<T>(request: Request): Promise<T> {
  try {
    const body = await request.json()
    return body as T
  } catch {
    throw new ApiError(400, 'Invalid request body', ErrorCodes.VALIDATION_ERROR)
  }
}

export function successResponse<T>(data: T, status = 200): Response {
  return Response.json(data, { status })
}

export function errorResponse(error: unknown): Response {
  return handleError(error)
}
