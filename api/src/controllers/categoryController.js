import pool from '../config/db.js';
import HttpError from '../utils/httpError.js';
import { asId, cleanString } from '../utils/validation.js';
import { hasColumn, notDeletedCondition, optionalColumn } from '../utils/dbSchema.js';

function toCategory(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sort_order: row.sort_order,
    color: row.color,
    icon: row.icon,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function fetchCategory(id) {
  const sortOrder = await optionalColumn('categories', 'c', 'sort_order', '0');
  const color = await optionalColumn('categories', 'c', 'color');
  const icon = await optionalColumn('categories', 'c', 'icon');
  const [rows] = await pool.execute(
    `SELECT c.id, c.name, c.description, ${sortOrder} AS sort_order, ${color} AS color, ${icon} AS icon, c.is_active, c.created_at, c.updated_at
     FROM categories c
     WHERE c.id = :id
     LIMIT 1`,
    { id }
  );

  return rows[0] || null;
}

export async function listActiveCategories(_req, res) {
  const sortOrder = await optionalColumn('categories', 'c', 'sort_order', '0');
  const color = await optionalColumn('categories', 'c', 'color');
  const icon = await optionalColumn('categories', 'c', 'icon');
  const notDeleted = await notDeletedCondition('categories', 'c');
  const orderSql = (await hasColumn('categories', 'sort_order')) ? 'c.sort_order ASC, c.name ASC' : 'c.name ASC';

  const [rows] = await pool.execute(
    `SELECT c.id, c.name, c.description, ${sortOrder} AS sort_order, ${color} AS color, ${icon} AS icon, c.is_active, c.created_at, c.updated_at
     FROM categories c
     WHERE c.is_active = 1
       AND ${notDeleted}
     ORDER BY ${orderSql}`
  );

  const categories = rows.map(toCategory);
  res.json({ data: categories, categories });
}

export async function listAllCategories(_req, res) {
  const sortOrder = await optionalColumn('categories', 'c', 'sort_order', '0');
  const color = await optionalColumn('categories', 'c', 'color');
  const icon = await optionalColumn('categories', 'c', 'icon');
  const notDeleted = await notDeletedCondition('categories', 'c');
  const orderSql = (await hasColumn('categories', 'sort_order')) ? 'c.sort_order ASC, c.name ASC' : 'c.name ASC';

  const [rows] = await pool.execute(
    `SELECT c.id, c.name, c.description, ${sortOrder} AS sort_order, ${color} AS color, ${icon} AS icon, c.is_active, c.created_at, c.updated_at
     FROM categories c
     WHERE ${notDeleted}
     ORDER BY ${orderSql}`
  );

  res.json({ data: rows.map(toCategory) });
}

export async function createCategory(req, res) {
  const name = cleanString(req.body.name);
  const description = cleanString(req.body.description);
  const sortOrder = Number(req.body.sort_order || 0);
  const color = cleanString(req.body.color) || null;
  const icon = cleanString(req.body.icon) || null;

  if (!name || name.length > 80) {
    throw new HttpError(400, 'Nome da categoria invalido.');
  }

  const fields = ['name', 'description', 'is_active'];
  const values = [':name', ':description', '1'];
  const params = { name, description: description || null };

  if (await hasColumn('categories', 'sort_order')) {
    fields.splice(2, 0, 'sort_order');
    values.splice(2, 0, ':sortOrder');
    params.sortOrder = sortOrder;
  }

  if (await hasColumn('categories', 'color')) {
    fields.splice(fields.length - 1, 0, 'color');
    values.splice(values.length - 1, 0, ':color');
    params.color = color;
  }

  if (await hasColumn('categories', 'icon')) {
    fields.splice(fields.length - 1, 0, 'icon');
    values.splice(values.length - 1, 0, ':icon');
    params.icon = icon;
  }

  const [result] = await pool.execute(
    `INSERT INTO categories (${fields.join(', ')})
     VALUES (${values.join(', ')})`,
    params
  );

  const category = await fetchCategory(result.insertId);
  res.status(201).json({ message: 'Categoria criada com sucesso.', category: toCategory(category) });
}

export async function updateCategory(req, res) {
  const id = asId(req.params.id);
  const name = cleanString(req.body.name);
  const description = cleanString(req.body.description);
  const sortOrder = Number(req.body.sort_order || 0);
  const color = cleanString(req.body.color) || null;
  const icon = cleanString(req.body.icon) || null;

  if (!id) throw new HttpError(400, 'Categoria invalida.');
  if (!name || name.length > 80) throw new HttpError(400, 'Nome da categoria invalido.');

  const fields = ['name = :name', 'description = :description'];
  const params = { id, name, description: description || null };
  const notDeleted = await notDeletedCondition('categories', 'c');

  if (await hasColumn('categories', 'sort_order')) {
    fields.push('sort_order = :sortOrder');
    params.sortOrder = sortOrder;
  }

  if (await hasColumn('categories', 'color')) {
    fields.push('color = :color');
    params.color = color;
  }

  if (await hasColumn('categories', 'icon')) {
    fields.push('icon = :icon');
    params.icon = icon;
  }

  const [result] = await pool.execute(
    `UPDATE categories c
     SET ${fields.join(', ')}
     WHERE c.id = :id
       AND ${notDeleted}`,
    params
  );

  if (!result.affectedRows) throw new HttpError(404, 'Categoria nao encontrada.');

  const [rows] = await pool.execute(
    `SELECT id, name, description, is_active, created_at, updated_at
     FROM categories
     WHERE id = :id`,
    { id }
  );

  res.json({ category: toCategory(rows[0]) });
}

export async function toggleCategory(req, res) {
  const id = asId(req.params.id);
  if (!id) throw new HttpError(400, 'Categoria invalida.');
  const notDeleted = await notDeletedCondition('categories', 'c');

  const [result] = await pool.execute(
    `UPDATE categories c
     SET is_active = IF(is_active = 1, 0, 1)
     WHERE c.id = :id
       AND ${notDeleted}`,
    { id }
  );

  if (!result.affectedRows) throw new HttpError(404, 'Categoria nao encontrada.');

  const [rows] = await pool.execute(
    `SELECT id, name, description, is_active, created_at, updated_at
     FROM categories
     WHERE id = :id`,
    { id }
  );

  res.json({ category: toCategory(rows[0]) });
}

export async function deleteCategory(req, res) {
  const id = asId(req.params.id);
  if (!id) throw new HttpError(400, 'Categoria invalida.');

  const notDeleted = await notDeletedCondition('categories', 'c');
  const [categories] = await pool.execute(`SELECT c.name FROM categories c WHERE c.id = :id AND ${notDeleted} LIMIT 1`, { id });
  if (!categories.length) throw new HttpError(404, 'Categoria nao encontrada.');

  if (await hasColumn('categories', 'deleted_at')) {
    await pool.execute('UPDATE categories SET deleted_at = UTC_TIMESTAMP(), is_active = 0 WHERE id = :id', { id });
  } else {
    await pool.execute('UPDATE categories SET is_active = 0 WHERE id = :id', { id });
  }
  res.json({ message: 'Categoria removida.' });
}
