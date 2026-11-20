/** Only authored adapter messages may be displayed. Never reflect transport/parser payloads. */
export class UiError extends Error {}

export function safeErrorMessage(error: unknown): string {
  return error instanceof UiError
    ? error.message
    : "The service could not complete this request. Please try again.";
}
