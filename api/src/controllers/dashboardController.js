import pool from '../config/db.js';
import { notDeletedCondition } from '../utils/dbSchema.js';

export async function getDashboard(_req, res) {
  const ticketsNotDeleted = await notDeletedCondition('tickets', 't');
  const usersNotDeleted = await notDeletedCondition('users', 'u');

  const [[summary]] = await pool.execute(
    `SELECT
       COUNT(*) AS total,
       SUM(status = 'Aberto') AS aberto,
       SUM(status = 'Em Atendimento') AS em_atendimento,
       SUM(status = 'Aguardando Usuario') AS aguardando_usuario,
       SUM(status = 'Resolvido') AS resolvido,
       SUM(status = 'Fechado') AS fechado
     FROM tickets t
     WHERE ${ticketsNotDeleted}`
  );

  const [byCategory] = await pool.execute(
    `SELECT t.category, COUNT(*) AS total
     FROM tickets t
     WHERE ${ticketsNotDeleted}
     GROUP BY category
     ORDER BY total DESC`
  );

  const [byPriority] = await pool.execute(
    `SELECT t.priority, COUNT(*) AS total
     FROM tickets t
     WHERE ${ticketsNotDeleted}
     GROUP BY priority
     ORDER BY FIELD(priority, 'Urgente', 'Alta', 'Media', 'Baixa')`
  );

  const [recentTickets] = await pool.execute(
    `SELECT t.id, t.title, t.priority, t.status, t.created_at
     FROM tickets t
     WHERE ${ticketsNotDeleted}
     ORDER BY t.created_at DESC
     LIMIT 8`
  );

  const [[users]] = await pool.execute(
    `SELECT
       COUNT(*) AS total,
       SUM(is_active = 1) AS active
     FROM users u
     WHERE ${usersNotDeleted}`
  );

  res.json({
    tickets: {
      total: Number(summary.total || 0),
      aberto: Number(summary.aberto || 0),
      em_atendimento: Number(summary.em_atendimento || 0),
      aguardando_usuario: Number(summary.aguardando_usuario || 0),
      resolvido: Number(summary.resolvido || 0),
      fechado: Number(summary.fechado || 0)
    },
    by_category: byCategory,
    by_priority: byPriority,
    recent_tickets: recentTickets,
    users_total: Number(users.total || 0),
    users_active: Number(users.active || 0)
  });
}
