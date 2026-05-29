export function formatBroadcaster(row) {
  if (!row?.broadcaster_id) return null;

  return {
    id: row.broadcaster_id,
    name: row.broadcaster_name || null,
    city: row.broadcaster_city || null,
    state: row.broadcaster_state || null
  };
}

export function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    sector: row.sector,
    broadcaster_id: row.broadcaster_id || null,
    broadcaster: formatBroadcaster(row),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function parseJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getPagination(query, defaultLimit = 20, maxLimit = 50) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), maxLimit);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function getMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    total_pages: Math.max(Math.ceil(total / limit), 1)
  };
}
