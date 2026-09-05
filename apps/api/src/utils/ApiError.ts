export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
    return new ApiError(message, 400, code, details);
  }

  static unauthorized(message: string, code = 'UNAUTHORIZED') {
    return new ApiError(message, 401, code);
  }

  static forbidden(message: string, code = 'FORBIDDEN') {
    return new ApiError(message, 403, code);
  }

  static notFound(message: string, code = 'NOT_FOUND') {
    return new ApiError(message, 404, code);
  }

  static conflict(message: string, code = 'CONFLICT', details?: unknown) {
    return new ApiError(message, 409, code, details);
  }

  static internal(message: string = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new ApiError(message, 500, code);
  }
}
