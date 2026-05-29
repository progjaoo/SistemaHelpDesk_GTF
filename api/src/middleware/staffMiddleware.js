import HttpError from '../utils/httpError.js';
import { isStaff } from '../utils/roles.js';

export function staffMiddleware(req, _res, next) {
  if (!isStaff(req.user)) {
    next(new HttpError(403, 'Acesso restrito a equipe de atendimento.'));
    return;
  }

  next();
}
