export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class TicketNotFoundError extends Error {
  constructor(id: string) {
    super(`Ticket with ID "${id}" not found.`);
    this.name = 'TicketNotFoundError';
    Object.setPrototypeOf(this, TicketNotFoundError.prototype);
  }
}

export class StorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'StorageError';
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}
