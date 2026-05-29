export function notFoundMiddleware(req, _res, next) {
  const error = new Error(`Rota nao encontrada: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorMiddleware(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const payload = {
    message: statusCode === 500 ? 'Erro interno do servidor.' : error.message
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    payload.stack = error.stack;
  }

  res.status(statusCode).json(payload);
}
