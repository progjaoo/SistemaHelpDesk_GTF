import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import HttpError from '../utils/httpError.js';

export async function authMiddleware(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new HttpError(401, 'Token de autenticacao ausente.');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');

    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.role,
         u.sector,
         u.broadcaster_id,
         u.is_active,
         u.created_at,
         u.updated_at,
         b.name AS broadcaster_name,
         b.city AS broadcaster_city,
         b.state AS broadcaster_state
       FROM users u
       LEFT JOIN broadcasters b ON b.id = u.broadcaster_id
       WHERE u.id = :id
       LIMIT 1`,
      { id: payload.sub }
    );

    if (!rows.length || !rows[0].is_active) {
      throw new HttpError(401, 'Usuario inativo ou nao encontrado.');
    }

    req.user = rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new HttpError(401, 'Sessao expirada. Faca login novamente.'));
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      next(new HttpError(401, 'Token de autenticacao invalido.'));
      return;
    }

    next(error);
  }
}
