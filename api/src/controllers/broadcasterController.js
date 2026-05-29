import pool from '../config/db.js';
import HttpError from '../utils/httpError.js';
import { asId, cleanString } from '../utils/validation.js';
import { hasColumn, notDeletedCondition, optionalColumn } from '../utils/dbSchema.js';

function toBroadcaster(row) {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    internal_code: row.internal_code,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function normalizeState(value) {
  const state = cleanString(value).toUpperCase();
  return state || null;
}

function validateBroadcaster({ name, state }) {
  if (!name || name.length > 120) {
    throw new HttpError(400, 'Nome da emissora invalido.');
  }

  if (state && !/^[A-Z]{2}$/.test(state)) {
    throw new HttpError(400, 'UF da emissora invalida.');
  }
}

export async function listActiveBroadcasters(_req, res) {
  const internalCode = await optionalColumn('broadcasters', 'b', 'internal_code');
  const notDeleted = await notDeletedCondition('broadcasters', 'b');

  const [rows] = await pool.execute(
    `SELECT b.id, b.name, b.city, b.state, ${internalCode} AS internal_code, b.is_active, b.created_at, b.updated_at
     FROM broadcasters b
     WHERE b.is_active = 1
       AND ${notDeleted}
     ORDER BY b.name ASC`
  );

  const broadcasters = rows.map(toBroadcaster);
  res.json({ data: broadcasters, broadcasters });
}

export async function listAllBroadcasters(_req, res) {
  const internalCode = await optionalColumn('broadcasters', 'b', 'internal_code');
  const notDeleted = await notDeletedCondition('broadcasters', 'b');

  const [rows] = await pool.execute(
    `SELECT b.id, b.name, b.city, b.state, ${internalCode} AS internal_code, b.is_active, b.created_at, b.updated_at
     FROM broadcasters b
     WHERE ${notDeleted}
     ORDER BY b.name ASC`
  );

  res.json({ data: rows.map(toBroadcaster) });
}

export async function createBroadcaster(req, res) {
  const name = cleanString(req.body.name);
  const city = cleanString(req.body.city) || null;
  const state = normalizeState(req.body.state);
  const internalCode = cleanString(req.body.internal_code) || null;

  validateBroadcaster({ name, state });

  const fields = ['name', 'city', 'state', 'is_active'];
  const values = [':name', ':city', ':state', '1'];
  const params = { name, city, state };

  if (await hasColumn('broadcasters', 'internal_code')) {
    fields.splice(3, 0, 'internal_code');
    values.splice(3, 0, ':internalCode');
    params.internalCode = internalCode;
  }

  const [result] = await pool.execute(
    `INSERT INTO broadcasters (${fields.join(', ')})
     VALUES (${values.join(', ')})`,
    params
  );

  const [rows] = await pool.execute(
    `SELECT id, name, city, state, is_active, created_at, updated_at
     FROM broadcasters
     WHERE id = :id`,
    { id: result.insertId }
  );

  res.status(201).json({ broadcaster: toBroadcaster(rows[0]) });
}

export async function updateBroadcaster(req, res) {
  const id = asId(req.params.id);
  const name = cleanString(req.body.name);
  const city = cleanString(req.body.city) || null;
  const state = normalizeState(req.body.state);
  const internalCode = cleanString(req.body.internal_code) || null;

  if (!id) throw new HttpError(400, 'Emissora invalida.');
  validateBroadcaster({ name, state });

  const fields = ['name = :name', 'city = :city', 'state = :state'];
  const params = { id, name, city, state };
  const notDeleted = await notDeletedCondition('broadcasters', 'b');

  if (await hasColumn('broadcasters', 'internal_code')) {
    fields.push('internal_code = :internalCode');
    params.internalCode = internalCode;
  }

  const [result] = await pool.execute(
    `UPDATE broadcasters b
     SET ${fields.join(', ')}
     WHERE b.id = :id
       AND ${notDeleted}`,
    params
  );

  if (!result.affectedRows) throw new HttpError(404, 'Emissora nao encontrada.');

  const [rows] = await pool.execute(
    `SELECT id, name, city, state, is_active, created_at, updated_at
     FROM broadcasters
     WHERE id = :id`,
    { id }
  );

  res.json({ broadcaster: toBroadcaster(rows[0]) });
}

export async function toggleBroadcaster(req, res) {
  const id = asId(req.params.id);
  if (!id) throw new HttpError(400, 'Emissora invalida.');
  const notDeleted = await notDeletedCondition('broadcasters', 'b');

  const [result] = await pool.execute(
    `UPDATE broadcasters b
     SET is_active = IF(is_active = 1, 0, 1)
     WHERE b.id = :id
       AND ${notDeleted}`,
    { id }
  );

  if (!result.affectedRows) throw new HttpError(404, 'Emissora nao encontrada.');

  const [rows] = await pool.execute(
    `SELECT id, name, city, state, is_active, created_at, updated_at
     FROM broadcasters
     WHERE id = :id`,
    { id }
  );

  res.json({ broadcaster: toBroadcaster(rows[0]) });
}

export async function deleteBroadcaster(req, res) {
  const id = asId(req.params.id);
  if (!id) throw new HttpError(400, 'Emissora invalida.');

  const usersNotDeleted = await notDeletedCondition('users', 'u');
  const [[usage]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM users u WHERE u.broadcaster_id = :id AND ${usersNotDeleted}`,
    { id }
  );

  if (Number(usage.total || 0) > 0) {
    throw new HttpError(409, `Nao e possivel remover: ${usage.total} usuario(s) vinculado(s) a essa emissora.`);
  }

  const [result] = await pool.execute(
    (await hasColumn('broadcasters', 'deleted_at'))
      ? `UPDATE broadcasters
         SET deleted_at = UTC_TIMESTAMP(),
             is_active = 0
         WHERE id = :id`
      : `UPDATE broadcasters
         SET is_active = 0
         WHERE id = :id`,
    { id }
  );
  if (!result.affectedRows) throw new HttpError(404, 'Emissora nao encontrada.');

  res.json({ message: 'Emissora removida.' });
}
