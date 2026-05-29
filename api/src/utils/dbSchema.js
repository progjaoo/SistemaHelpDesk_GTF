import pool from '../config/db.js';

const columnCache = new Map();

export async function hasColumn(tableName, columnName) {
  const cacheKey = `${tableName}.${columnName}`;

  if (columnCache.has(cacheKey)) {
    return columnCache.get(cacheKey);
  }

  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :tableName
       AND COLUMN_NAME = :columnName
     LIMIT 1`,
    { tableName, columnName }
  );

  const exists = rows.length > 0;
  columnCache.set(cacheKey, exists);
  return exists;
}

export async function optionalColumn(tableName, alias, columnName, fallback = 'NULL') {
  return (await hasColumn(tableName, columnName)) ? `${alias}.${columnName}` : fallback;
}

export async function notDeletedCondition(tableName, alias) {
  return (await hasColumn(tableName, 'deleted_at')) ? `${alias}.deleted_at IS NULL` : '1=1';
}
