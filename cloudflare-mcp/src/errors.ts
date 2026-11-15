/** Domain errors that are safe to return to an MCP client. */
export class ToolError extends Error {
  readonly code: string;
  readonly hint?: string;

  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.hint = hint;
  }
}
