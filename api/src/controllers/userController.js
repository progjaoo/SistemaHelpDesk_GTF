import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/db.js';
import { ROLES } from '../config/constants.js';
import HttpError from '../utils/httpError.js';
import { asId, asNullableId, cleanString, hasOwn, isEmail, normalizeEmail, parseBoolean } from '../utils/validation.js';
import { getMeta, getPagination, publicUser } from '../utils/formatters.js';
import { hasColumn, notDeletedCondition } from '../utils/dbSchema.js';

async function getUserSelect() {
  const hasRoleId = await hasColumn('users', 'role_id');
  const roleSelect = hasRoleId ? 'COALESCE(r.name, u.role)' : 'u.role';
  const roleIdSelect = hasRoleId ? 'u.role_id' : 'NULL';
  const roleJoin = hasRoleId ? 'LEFT JOIN roles r ON r.id = u.role_id' : '';

  return `
    SELECT
      u.id,
      u.name,
      u.email,
      ${roleSelect} AS role,
      ${roleIdSelect} AS role_id,
      u.sector,
      u.broadcaster_id,
      u.is_active,
      u.created_at,
      u.updated_at,
      b.name AS broadcaster_name,
      b.city AS broadcaster_city,
      b.state AS broadcaster_state,
      COUNT(t.id) AS tickets_count
    FROM users u
    ${roleJoin}
    LEFT JOIN broadcasters b ON b.id = u.broadcaster_id
    LEFT JOIN tickets t ON t.user_id = u.id
  `;
}

async function fetchUser(id) {
  const userSelect = await getUserSelect();
  const notDeleted = await notDeletedCondition('users', 'u');

  const [rows] = await pool.execute(
    `${userSelect}
     WHERE u.id = :id
       AND ${notDeleted}
     GROUP BY u.id
     LIMIT 1`,
    { id }
  );

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

export async function createUser(req, res) {
  const name = cleanString(req.body.name);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const role = cleanString(req.body.role || 'user');
  const sector = cleanString(req.body.sector);
  const broadcasterId = asNullableId(req.body.broadcaster_id);

  if (!name || name.length < 3) throw new HttpError(400, 'Nome invalido.');
  if (!isEmail(email)) throw new HttpError(400, 'E-mail invalido.');
  if (password.length < 8) throw new HttpError(400, 'A senha deve ter pelo menos 8 caracteres.');
  if (!ROLES.includes(role)) throw new HttpError(400, 'Permissao invalida.');
  if (!sector) throw new HttpError(400, 'Setor invalido.');
  if (broadcasterId === undefined) throw new HttpError(400, 'Emissora invalida.');

  await ensureBroadcasterExists(broadcasterId);

  const [existing] = await pool.execute('SELECT id FROM users WHERE email = :email LIMIT 1', { email });
  if (existing.length) throw new HttpError(409, 'Ja existe um usuario cadastrado com este e-mail.');

  const passwordHash = await bcrypt.hash(password, 10);
  const fields = ['name', 'email', 'password_hash', 'role', 'sector', 'broadcaster_id', 'is_active'];
  const values = [':name', ':email', ':passwordHash', ':role', ':sector', ':broadcasterId', '1'];
  const params = { name, email, passwordHash, role, sector, broadcasterId };

  if (await hasColumn('users', 'role_id')) {
    fields.splice(4, 0, 'role_id');
    values.splice(4, 0, '(SELECT id FROM roles WHERE name = :role LIMIT 1)');
  }

  const [result] = await pool.execute(
    `INSERT INTO users (${fields.join(', ')})
     VALUES (${values.join(', ')})`,
    params
  );

  const user = await fetchUser(result.insertId);
  res.status(201).json({ message: 'Usuario criado com sucesso.', user: toUser(user) });
}

function toUser(row) {
  return {
    ...publicUser(row),
    tickets_count: Number(row.tickets_count || 0)
  };
}

export async function getMyUser(req, res) {
  const user = await fetchUser(req.user.id);
  res.json({ user: toUser(user) });
}

export async function updateMyUser(req, res) {
  const allowedBody = {};

  if (hasOwn(req.body, 'name')) allowedBody.name = req.body.name;
  if (hasOwn(req.body, 'sector')) allowedBody.sector = req.body.sector;
  if (hasOwn(req.body, 'broadcaster_id')) allowedBody.broadcaster_id = req.body.broadcaster_id;

  req.body = allowedBody;
  req.params.id = String(req.user.id);
  await updateUser(req, res);
}

export async function updateMyUserPassword(req, res) {
  const currentPassword = String(req.body.current_password || req.body.currentPassword || '');
  const password = String(req.body.password || req.body.new_password || req.body.newPassword || '');

  if (!currentPassword || !password) {
    throw new HttpError(400, 'Informe a senha atual e a nova senha.');
  }

  if (password.length < 8) {
    throw new HttpError(400, 'A nova senha deve ter pelo menos 8 caracteres.');
  }

  const notDeleted = await notDeletedCondition('users', 'u');
  const [rows] = await pool.execute(`SELECT u.password_hash FROM users u WHERE u.id = :id AND ${notDeleted} LIMIT 1`, { id: req.user.id });
  if (!rows.length) throw new HttpError(404, 'Usuario nao encontrado.');

  const passwordMatches = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!passwordMatches) throw new HttpError(400, 'Senha atual invalida.');

  const passwordHash = await bcrypt.hash(password, 10);

  await pool.execute(
    `UPDATE users
     SET password_hash = :passwordHash,
         reset_token_hash = NULL,
         reset_token_expires = NULL
     WHERE id = :id`,
    { id: req.user.id, passwordHash }
  );

  res.json({ message: 'Senha alterada com sucesso.' });
}

export async function listUsers(req, res) {
  const where = [];
  const params = {};
  const userSelect = await getUserSelect();
  const usersNotDeleted = await notDeletedCondition('users', 'u');
  const hasRoleId = await hasColumn('users', 'role_id');
  const roleExpression = hasRoleId ? 'COALESCE(r.name, u.role)' : 'u.role';
  const role = cleanString(req.query.role);
  const active = parseBoolean(req.query.active ?? req.query.is_active);
  const broadcasterId = asNullableId(req.query.broadcaster_id);
  const search = cleanString(req.query.search);
  const usePagination = hasOwn(req.query, 'page') || req.originalUrl.includes('/admin');
  const { page, limit, offset } = getPagination(req.query);

  if (role) {
    if (!ROLES.includes(role)) throw new HttpError(400, 'Permissao invalida.');
    where.push(`${roleExpression} = :role`);
    params.role = role;
  }

  if (active !== null) {
    where.push('u.is_active = :active');
    params.active = active ? 1 : 0;
  }

  if (broadcasterId === undefined) {
    throw new HttpError(400, 'Emissora invalida.');
  }

  if (broadcasterId) {
    where.push('u.broadcaster_id = :broadcasterId');
    params.broadcasterId = broadcasterId;
  }

  if (search) {
    where.push('(u.name LIKE :search OR u.email LIKE :search OR u.sector LIKE :search)');
    params.search = `%${search}%`;
  }

  where.push(usersNotDeleted);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `${userSelect}
     ${whereSql}
     GROUP BY u.id
     ORDER BY u.name ASC
     ${usePagination ? `LIMIT ${limit} OFFSET ${offset}` : ''}`,
    params
  );

  const users = rows.map(toUser);

  if (!usePagination) {
    res.json({ users, data: users });
    return;
  }

  const [[count]] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM users u
     ${hasRoleId ? 'LEFT JOIN roles r ON r.id = u.role_id' : ''}
     ${whereSql}`,
    params
  );

  res.json({ data: users, users, meta: getMeta(Number(count.total || 0), page, limit) });
}

export async function getAdminUser(req, res) {
  const id = asId(req.params.id);
  if (!id) throw new HttpError(400, 'Usuario invalido.');

  const user = await fetchUser(id);
  if (!user) throw new HttpError(404, 'Usuario nao encontrado.');

  res.json({ user: toUser(user) });
}

export async function updateUser(req, res) {
  const userId = asId(req.params.id);
  if (!userId) throw new HttpError(400, 'Usuario invalido.');

  const existing = await fetchUser(userId);
  if (!existing) throw new HttpError(404, 'Usuario nao encontrado.');

  const fields = [];
  const params = { id: userId };

  if (hasOwn(req.body, 'name')) {
    const name = cleanString(req.body.name);
    if (name.length < 3) throw new HttpError(400, 'Nome invalido.');
    fields.push('name = :name');
    params.name = name;
  }

  if (hasOwn(req.body, 'email')) {
    const email = normalizeEmail(req.body.email);
    if (!isEmail(email)) throw new HttpError(400, 'E-mail invalido.');
    const [emailRows] = await pool.execute(
      'SELECT id FROM users WHERE email = :email AND id <> :id LIMIT 1',
      { email, id: userId }
    );
    if (emailRows.length) throw new HttpError(409, 'Ja existe um usuario cadastrado com este e-mail.');
    fields.push('email = :email');
    params.email = email;
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

  if (hasOwn(req.body, 'role')) {
    const role = cleanString(req.body.role);
    if (!ROLES.includes(role)) throw new HttpError(400, 'Permissao invalida.');
    if (Number(req.user.id) === userId && role !== 'admin') {
      throw new HttpError(400, 'Voce nao pode remover sua propria permissao de administrador.');
    }
    fields.push('role = :role');
    if (await hasColumn('users', 'role_id')) {
      fields.push('role_id = (SELECT id FROM roles WHERE name = :role LIMIT 1)');
    }
    params.role = role;
  }

  if (hasOwn(req.body, 'is_active')) {
    const isActive = parseBoolean(req.body.is_active);
    if (isActive === null) throw new HttpError(400, 'Status de ativacao invalido.');
    if (Number(req.user.id) === userId && !isActive) {
      throw new HttpError(400, 'Voce nao pode desativar seu proprio usuario.');
    }
    fields.push('is_active = :isActive');
    params.isActive = isActive ? 1 : 0;
  }

  if (!fields.length) throw new HttpError(400, 'Nenhuma alteracao informada.');

  await pool.execute(
    `UPDATE users
     SET ${fields.join(', ')}
     WHERE id = :id`,
    params
  );

  const user = await fetchUser(userId);
  res.json({ message: 'Usuario atualizado com sucesso.', user: toUser(user) });
}

export async function updateUserRole(req, res) {
  req.body = { role: req.body.role };
  await updateUser(req, res);
}

export async function updateUserActive(req, res) {
  req.body = { is_active: req.body.is_active };
  await updateUser(req, res);
}

export async function forcePasswordReset(req, res) {
  const userId = asId(req.params.id);
  if (!userId) throw new HttpError(400, 'Usuario invalido.');

  const existing = await fetchUser(userId);
  if (!existing) throw new HttpError(404, 'Usuario nao encontrado.');

  const token = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await pool.execute(
    `UPDATE users
     SET reset_token_hash = :resetTokenHash,
         reset_token_expires = :expiresAt
     WHERE id = :id`,
    { id: userId, resetTokenHash, expiresAt }
  );

  res.json({ message: 'Token de redefinicao gerado.', token });
}

export async function deleteUser(req, res) {
  const userId = asId(req.params.id);
  if (!userId) throw new HttpError(400, 'Usuario invalido.');
  if (Number(req.user.id) === userId) throw new HttpError(400, 'Voce nao pode remover seu proprio usuario.');

  const hasDeletedAt = await hasColumn('users', 'deleted_at');
  const [result] = await pool.execute(
    hasDeletedAt
      ? `UPDATE users
         SET deleted_at = UTC_TIMESTAMP(),
             is_active = 0
         WHERE id = :id`
      : `UPDATE users
         SET is_active = 0
         WHERE id = :id`,
    { id: userId }
  );
  if (!result.affectedRows) throw new HttpError(404, 'Usuario nao encontrado.');

  res.json({ message: 'Usuario removido.' });
}
