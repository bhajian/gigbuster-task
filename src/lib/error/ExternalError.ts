/**
 * Use this class when you want the global error handler in `handler.ts` to
 * show the status code and error message to the user.
 *
 * Do not use with sensitive data.
 */
export class ExternalError extends Error {
  public statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}
