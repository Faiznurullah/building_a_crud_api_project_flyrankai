class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class ValidationError extends HttpError {
  constructor(message) {
    super(400, message);
  }
}

class NotFoundError extends HttpError {
  constructor(message) {
    super(404, message);
  }
}

module.exports = { HttpError, ValidationError, NotFoundError };
