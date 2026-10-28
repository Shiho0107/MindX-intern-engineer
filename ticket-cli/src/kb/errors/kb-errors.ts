export class KBError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'KBError';
  }
}

export class KBNotFoundError extends KBError {
  constructor(public readonly docId: string) {
    super(`Document with ID "${docId}" was not found in the Knowledge Base`);
    this.name = 'KBNotFoundError';
  }
}

export class KBValidationError extends KBError {
  constructor(message: string) {
    super(message);
    this.name = 'KBValidationError';
  }
}

export class KBConnectionError extends KBError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'KBConnectionError';
  }
}
