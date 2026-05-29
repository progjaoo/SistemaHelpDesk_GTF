import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import HttpError from '../utils/httpError.js';
import { asNullableId, cleanString, hasOwn, isEmail, normalizeEmail } from '../utils/validation.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { publicUser } from '../utils/formatters.js';

function signToken(user) {
  return jwt.sign(
    { role: user.role },
    process.env.JWT_SECRET || 'dev-secret',
    {
      subject: String(user.id),
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    }
  );
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

const userSelect = `
  SELECT
    u.id,
    u.name,
    u.email,
    u.password_hash,
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
`;

async function findUserById(id) {
  const [rows] = await pool.execute(`${userSelect} WHERE u.id = :id LIMIT 1`, { id });
  return rows[0] || null;
}

async function ensureBroadcasterExists(broadcasterId) {
  if (!broadcasterId) return;

  const [rows] = await pool.execute(
    'SELECT id FROM broadcasters WHERE id = :id AND is_active = 1 LIMIT 1',
    { id: broadcasterId }
  );

  if (!rows.length) {
    throw new HttpError(400, 'Emissora invalida ou inativa.');
  }
}

async function createRefreshSession(user, req) {
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const refreshTokenHash = tokenHash(refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await pool.execute(
    `INSERT INTO user_sessions (
       user_id,
       refresh_token_hash,
       device_info,
       ip_address,
       user_agent,
       expires_at
     )
     VALUES (
       :userId,
       :refreshTokenHash,
       :deviceInfo,
       :ipAddress,
       :userAgent,
       :expiresAt
     )`,
    {
      userId: user.id,
      refreshTokenHash,
      deviceInfo: cleanString(req.body.device_info),
      ipAddress: getIp(req),
      userAgent: cleanString(req.headers['user-agent']),
      expiresAt
    }
  );

  return refreshToken;
}

export async function register(req, res) {
  const name = cleanString(req.body.name);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const sector = cleanString(req.body.sector || req.body.radioquetrabalha);
  const broadcasterId = asNullableId(req.body.broadcaster_id);

  if (!name || name.length < 3) {
    throw new HttpError(400, 'Informe um nome com pelo menos 3 caracteres.');
  }

  if (!isEmail(email)) {
    throw new HttpError(400, 'Informe um e-mail valido.');
  }

  if (password.length < 8) {
    throw new HttpError(400, 'A senha deve ter pelo menos 8 caracteres.');
  }

  if (!sector) {
    throw new HttpError(400, 'Informe o setor ou radio em que trabalha.');
  }

  if (broadcasterId === undefined) {
    throw new HttpError(400, 'Emissora invalida.');
  }

  await ensureBroadcasterExists(broadcasterId);

  const [existing] = await pool.execute(
    'SELECT id FROM users WHERE email = :email LIMIT 1',
    { email }
  );

  if (existing.length) {
    throw new HttpError(409, 'Ja existe um usuario cadastrado com este e-mail.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await pool.execute(
    `INSERT INTO users (name, email, password_hash, role, sector, broadcaster_id, is_active)
     VALUES (:name, :email, :passwordHash, 'user', :sector, :broadcasterId, 1)`,
    { name, email, passwordHash, sector, broadcasterId }
  );

  const user = await findUserById(result.insertId);
  const refreshToken = await createRefreshSession(user, req);

  res.status(201).json({
    message: 'Cadastro realizado com sucesso.',
    user: publicUser(user),
    token: signToken(user),
    refresh_token: refreshToken
  });
}

export async function login(req, res) {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!isEmail(email) || !password) {
    throw new HttpError(400, 'Informe e-mail e senha.');
  }

  const [rows] = await pool.execute(
    `${userSelect}
     WHERE u.email = :email
     LIMIT 1`,
    { email }
  );

  if (!rows.length) {
    throw new HttpError(401, 'E-mail ou senha invalidos.');
  }

  const user = rows[0];

  if (!user.is_active) {
    throw new HttpError(403, 'Usuario inativo. Fale com a TI.');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    throw new HttpError(401, 'E-mail ou senha invalidos.');
  }

  const refreshToken = await createRefreshSession(user, req);

  res.json({
    user: publicUser(user),
    token: signToken(user),
    refresh_token: refreshToken
  });
}

export async function me(req, res) {
  const user = await findUserById(req.user.id);
  res.json({ user: publicUser(user) });
}

export async function updateMe(req, res) {
  const fields = [];
  const params = { id: req.user.id };

  if (hasOwn(req.body, 'name')) {
    const name = cleanString(req.body.name);
    if (name.length < 3) throw new HttpError(400, 'Nome invalido.');
    fields.push('name = :name');
    params.name = name;
  }

  if (hasOwn(req.body, 'sector')) {
    const sector = cleanString(req.body.sector);
    if (!sector) throw new HttpError(400, 'Setor invalido.');
    fields.push('sector = :sector');
    params.sector = sector;
  }

  if (hasOwn(req.body, 'broadcaster_id')) {
    const broadcasterId = asNullableId(req.body.broadcaster_id);
    if (broadcasterId === undefined) throw new HttpError(400, 'Emissora invalida.');
    await ensureBroadcasterExists(broadcasterId);
    fields.push('broadcaster_id = :broadcasterId');
    params.broadcasterId = broadcasterId;
  }

  if (!fields.length) {
    throw new HttpError(400, 'Nenhuma alteracao informada.');
  }

  await pool.execute(
    `UPDATE users
     SET ${fields.join(', ')}
     WHERE id = :id`,
    params
  );

  const user = await findUserById(req.user.id);
  res.json({ message: 'Perfil atualizado com sucesso.', user: publicUser(user) });
}

export async function updateMyPassword(req, res) {
  const currentPassword = String(req.body.current_password || req.body.currentPassword || '');
  const password = String(req.body.password || req.body.new_password || req.body.newPassword || '');

  if (!currentPassword || !password) {
    throw new HttpError(400, 'Informe a senha atual e a nova senha.');
  }

  if (password.length < 8) {
    throw new HttpError(400, 'A nova senha deve ter pelo menos 8 caracteres.');
  }

  const [rows] = await pool.execute(
    'SELECT id, password_hash FROM users WHERE id = :id LIMIT 1',
    { id: req.user.id }
  );

  if (!rows.length) {
    throw new HttpError(404, 'Usuario nao encontrado.');
  }

  const passwordMatches = await bcrypt.compare(currentPassword, rows[0].password_hash);

  if (!passwordMatches) {
    throw new HttpError(400, 'Senha atual invalida.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await pool.execute(
    `UPDATE users
     SET password_hash = :passwordHash,
         reset_token_hash = NULL,
         reset_token_expires = NULL
     WHERE id = :id`,
    { passwordHash, id: req.user.id }
  );

  res.json({ message: 'Senha alterada com sucesso.' });
}

export async function refreshSession(req, res) {
  const refreshToken = cleanString(req.body.refresh_token || req.body.refreshToken);

  if (!refreshToken) {
    throw new HttpError(400, 'Refresh token ausente.');
  }

  const refreshTokenHash = tokenHash(refreshToken);

  const [rows] = await pool.execute(
    `${userSelect}
     INNER JOIN user_sessions us ON us.user_id = u.id
     WHERE us.refresh_token_hash = :refreshTokenHash
       AND us.revoked_at IS NULL
       AND us.expires_at > UTC_TIMESTAMP()
       AND u.is_active = 1
     LIMIT 1`,
    { refreshTokenHash }
  );

  if (!rows.length) {
    throw new HttpError(401, 'Sessao expirada. Faca login novamente.');
  }

  const user = rows[0];

  await pool.execute(
    `UPDATE user_sessions
     SET revoked_at = UTC_TIMESTAMP()
     WHERE refresh_token_hash = :refreshTokenHash`,
    { refreshTokenHash }
  );

  const nextRefreshToken = await createRefreshSession(user, req);

  res.json({
    user: publicUser(user),
    token: signToken(user),
    refresh_token: nextRefreshToken
  });
}

export async function logout(req, res) {
  const refreshToken = cleanString(req.body.refresh_token || req.body.refreshToken);

  if (refreshToken) {
    await pool.execute(
      `UPDATE user_sessions
       SET revoked_at = UTC_TIMESTAMP()
       WHERE refresh_token_hash = :refreshTokenHash
         AND user_id = :userId
         AND revoked_at IS NULL`,
      {
        refreshTokenHash: tokenHash(refreshToken),
        userId: req.user.id
      }
    );
  }

  res.json({ message: 'Logout realizado com sucesso.' });
}

export async function forgotPassword(req, res) {
  const email = normalizeEmail(req.body.email);

  if (!isEmail(email)) {
    throw new HttpError(400, 'Informe um e-mail valido.');
  }

  const [rows] = await pool.execute(
    'SELECT id, name, email FROM users WHERE email = :email AND is_active = 1 LIMIT 1',
    { email }
  );

  if (!rows.length) {
    res.json({ message: 'Se o e-mail existir, voce recebera um link em instantes.' });
    return;
  }

  const user = rows[0];
  const token = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = tokenHash(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await pool.execute(
    `UPDATE users
     SET reset_token_hash = :resetTokenHash,
         reset_token_expires = :expiresAt
     WHERE id = :id`,
    { resetTokenHash, expiresAt, id: user.id }
  );

  await sendPasswordResetEmail(user, token);

  res.json({ message: 'Se o e-mail existir, voce recebera um link em instantes.' });
}

export async function resetPassword(req, res) {
  const token = cleanString(req.body.token);
  const password = String(req.body.password || '');

  if (!token) {
    throw new HttpError(400, 'Token de redefinicao ausente.');
  }

  if (password.length < 8) {
    throw new HttpError(400, 'A nova senha deve ter pelo menos 8 caracteres.');
  }

  const resetTokenHash = tokenHash(token);

  const [rows] = await pool.execute(
    `SELECT id
     FROM users
     WHERE reset_token_hash = :resetTokenHash
       AND reset_token_expires > UTC_TIMESTAMP()
       AND is_active = 1
     LIMIT 1`,
    { resetTokenHash }
  );

  if (!rows.length) {
    throw new HttpError(400, 'Token invalido ou expirado.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await pool.execute(
    `UPDATE users
     SET password_hash = :passwordHash,
         reset_token_hash = NULL,
         reset_token_expires = NULL
     WHERE id = :id`,
    { passwordHash, id: rows[0].id }
  );

  res.json({ message: 'Senha redefinida com sucesso.' });
}
