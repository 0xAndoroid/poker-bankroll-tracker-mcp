export class PbtApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PbtApiError";
  }
}

export class AuthError extends PbtApiError {
  constructor() {
    super("Authentication failed — check PBT_API_KEY.");
    this.name = "AuthError";
  }
}

export class RateLimitError extends PbtApiError {
  constructor() {
    super("Rate limit exceeded (20 requests/15min). Try again later.");
    this.name = "RateLimitError";
  }
}

export class NetworkError extends PbtApiError {
  constructor(cause: unknown) {
    const detail = cause instanceof Error ? cause.message : "Unknown network error";
    super(`Network error: ${detail}`);
    this.name = "NetworkError";
    this.cause = cause;
  }
}
