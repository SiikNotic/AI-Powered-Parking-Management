export type ServiceErrorCode = 'not_found' | 'forbidden' | 'network' | 'invalid' | 'insufficient_stock' | 'closed' | 'duplicate'

export class ServiceError extends Error {
  readonly code: ServiceErrorCode
  constructor(code: ServiceErrorCode, message?: string) {
    super(message ?? code)
    this.code = code
    this.name = 'ServiceError'
  }
}
