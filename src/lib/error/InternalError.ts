/**
 * Use this class when you want the global error handler in `handler.ts` to
 * respond to the user with a 500 "Internal Server Error" message.
 *
 * For use with sensitive data or when the error is not actionable by the user.
 */
export class InternalError extends Error {
  constructor(message: string) {
    super(message)
  }
}
