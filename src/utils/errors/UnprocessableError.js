class UnprocessableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnprocessableError';
    this.status = 422;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default UnprocessableError;
