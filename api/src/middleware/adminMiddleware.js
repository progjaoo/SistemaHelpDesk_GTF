import HttpError from '../utils/httpError.js';
import { isAdmin } from '../utils/roles.js';

export function adminMiddleware(req, _res, next) {
  if (!isAdmin(req.user)) {
    next(new HttpError(403, 'Acesso restrito a administradores.'));
    return;
  }

  next();
}
