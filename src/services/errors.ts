/**
 * Errors a service can raise for invalid input. `code` maps to a translated
 * message in `errors.*`, so the UI can show it as-is.
 */
export type ServiceErrorCode =
  | 'duplicateSpaceNumber'
  | 'duplicateLocationCode'
  | 'spaceUnavailable'
  | 'invalidDates'
  | 'notFound'
  | 'invalidTransition'

export class ServiceError extends Error {
  readonly code: ServiceErrorCode
  constructor(code: ServiceErrorCode) {
    super(code)
    this.code = code
    this.name = 'ServiceError'
  }
}
