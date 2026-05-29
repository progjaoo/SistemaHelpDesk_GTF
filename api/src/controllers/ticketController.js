import pool from '../config/db.js';
import { PRIORITIES, TICKET_STATUSES } from '../config/constants.js';
import HttpError from '../utils/httpError.js';
import { asId, asNullableId, cleanString, hasOwn } from '../utils/validation.js';
import { getMeta, getPagination, parseJson } from '../utils/formatters.js';
import { isStaff } from '../utils/roles.js';
import { sendStatusUpdatedEmail, sendTicketCreatedEmail } from '../services/emailService.js';
import { hasColumn, notDeletedCondition, optionalColumn } from '../utils/dbSchema.js';

async function getTicketSelect() {
  const categoryId = await optionalColumn('tickets', 't', 'category_id');
  const ticketBroadcaster = await optionalColumn('tickets', 't', 'broadcaster_id', 'u.broadcaster_id');
  const problemType = await optionalColumn('tickets', 't', 'problem_type');
  const affectedEnvironment = await optionalColumn('tickets', 't', 'affected_environment');
  const affectedEquipment = await optionalColumn('tickets', 't', 'affected_equipment');
  const patrimonyNumber = await optionalColumn('tickets', 't', 'patrimony_number');
  const attachments = await optionalColumn('tickets', 't', 'attachments');
  const closedAt = await optionalColumn('tickets', 't', 'closed_at');

  return `
    SELECT
      t.id,
      t.title,
      t.description,
      t.category,
      ${categoryId} AS category_id,
      t.priority,
      t.status,
      t.location,
      ${ticketBroadcaster} AS broadcaster_id,
      ${problemType} AS problem_type,
      ${affectedEnvironment} AS affected_environment,
      ${affectedEquipment} AS affected_equipment,
      ${patrimonyNumber} AS patrimony_number,
      ${attachments} AS attachments,
      t.user_id,
      t.assigned_to,
      t.created_at,
      t.updated_at,
      ${closedAt} AS closed_at,
      u.name AS user_name,
      u.email AS user_email,
      u.sector AS user_sector,
      ${ticketBroadcaster} AS user_broadcaster_id,
      b.name AS user_broadcaster_name,
      b.city AS user_broadcaster_city,
      b.state AS user_broadcaster_state,
      a.name AS assigned_name,
      a.email AS assigned_email
    FROM tickets t
    INNER JOIN users u ON u.id = t.user_id
    LEFT JOIN broadcasters b ON b.id = ${ticketBroadcaster}
    LEFT JOIN users a ON a.id = t.assigned_to
  `;
}

async function categoryExists(category) {
  const notDeleted = await notDeletedCondition('categories', 'c');

  const [rows] = await pool.execute(
    `SELECT c.id, c.name
     FROM categories c
     WHERE c.name = :category
       AND c.is_active = 1
       AND ${notDeleted}
     LIMIT 1`,
    { category }
  );

  return rows[0] || null;
}

function normalizeTicket(row) {
  if (!row) return null;

  const attachments = parseJson(row.attachments, []);

  return {
    ...row,
    attachments,
    has_attachments: Array.isArray(attachments) && attachments.length > 0,
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      sector: row.user_sector,
      broadcaster: row.user_broadcaster_id
        ? {
            id: row.user_broadcaster_id,
            name: row.user_broadcaster_name,
            city: row.user_broadcaster_city,
            state: row.user_broadcaster_state
          }
        : null
    }
  };
}

function normalizeAttachments(value) {
  const attachments = Array.isArray(value) ? value : [];

  if (attachments.length > 3) {
    throw new HttpError(400, 'Envie no maximo 3 anexos por chamado.');
  }

  return attachments.map((attachment) => {
    const name = cleanString(attachment.name);
    const mimeType = cleanString(attachment.mime_type || attachment.type);
    const dataBase64 = cleanString(attachment.data_base64 || attachment.data);

    if (!name || !mimeType || !dataBase64) {
      throw new HttpError(400, 'Anexo invalido.');
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(mimeType)) {
      throw new HttpError(400, 'Tipo de anexo nao permitido.');
    }

    const base64 = dataBase64.includes(',') ? dataBase64.split(',').pop() : dataBase64;
    const sizeKb = Math.ceil(Buffer.byteLength(base64, 'base64') / 1024);
    const maxKb = mimeType === 'video/mp4' ? 10 * 1024 : 2 * 1024;

    if (sizeKb > maxKb) {
      throw new HttpError(400, 'Anexo excede o tamanho maximo permitido.');
    }

    return {
      name,
      mime_type: mimeType,
      size_kb: Number(attachment.size_kb || sizeKb),
      data_base64: dataBase64
    };
  });
}

async function validateTicketInput({ title, description, category, priority, location }) {
  if (!title || title.length < 5 || title.length > 160) {
    throw new HttpError(400, 'Informe um titulo entre 5 e 160 caracteres.');
  }

  if (!description || description.length < 10 || description.length > 3000) {
    throw new HttpError(400, 'Informe uma descricao entre 10 e 3000 caracteres.');
  }

  const categoryRow = category ? await categoryExists(category) : null;

  if (!categoryRow) {
    throw new HttpError(400, 'Categoria invalida.');
  }

  if (!PRIORITIES.includes(priority)) {
    throw new HttpError(400, 'Prioridade invalida.');
  }

  if (!location || location.length < 2 || location.length > 120) {
    throw new HttpError(400, 'Informe a localizacao ou setor entre 2 e 120 caracteres.');
  }

  return categoryRow;
}

function canReadTicket(user, ticket) {
  return isStaff(user) || Number(ticket.user_id) === Number(user.id);
}

async function fetchTicket(id) {
  const ticketSelect = await getTicketSelect();
  const notDeleted = await notDeletedCondition('tickets', 't');
  const [rows] = await pool.execute(`${ticketSelect} WHERE t.id = :id AND ${notDeleted} LIMIT 1`, { id });
  return normalizeTicket(rows[0]);
}

async function fetchTicketAttachments(ticketId) {
  if (!(await hasColumn('ticket_attachments', 'file_data'))) {
    return [];
  }

  const [rows] = await pool.execute(
    `SELECT
       original_name AS name,
       mime_type,
       CEIL(file_size / 1024) AS size_kb,
       file_data AS data_base64
     FROM ticket_attachments
     WHERE ticket_id = :ticketId
     ORDER BY created_at ASC`,
    { ticketId }
  );

  return rows;
}

async function ensureTicketAccess(id, user) {
  const ticket = await fetchTicket(id);

  if (!ticket) {
    throw new HttpError(404, 'Chamado nao encontrado.');
  }

  if (!canReadTicket(user, ticket)) {
    throw new HttpError(403, 'Voce nao tem acesso a este chamado.');
  }

  return ticket;
}

async function safeSendEmail(sendOperation) {
  try {
    await sendOperation();
  } catch (error) {
    console.error('[email:error]', error.message);
  }
}

export async function listCategories(_req, res) {
  const notDeleted = await notDeletedCondition('categories', 'c');

  const [rows] = await pool.execute(
    `SELECT c.id, c.name, c.description, c.is_active
     FROM categories c
     WHERE c.is_active = 1
       AND ${notDeleted}
     ORDER BY c.name ASC`
  );

  res.json({ categories: rows });
}

export async function createTicket(req, res) {
  const title = cleanString(req.body.title);
  const description = cleanString(req.body.description);
  const category = cleanString(req.body.category);
  const priority = cleanString(req.body.priority || 'Media');
  const location = cleanString(req.body.location || req.user.sector);
  const broadcasterId = asNullableId(req.body.broadcaster_id ?? req.user.broadcaster_id);
  const problemType = cleanString(req.body.problem_type) || null;
  const affectedEnvironment = cleanString(req.body.affected_environment) || null;
  const affectedEquipment = cleanString(req.body.affected_equipment) || null;
  const patrimonyNumber = cleanString(req.body.patrimony_number) || null;
  const attachments = normalizeAttachments(req.body.attachments);

  if (broadcasterId === undefined) {
    throw new HttpError(400, 'Emissora invalida.');
  }

  const categoryRow = await validateTicketInput({ title, description, category, priority, location });
  const fields = ['title', 'description', 'category', 'priority', 'status', 'location', 'user_id'];
  const values = [':title', ':description', ':category', ':priority', "'Aberto'", ':location', ':userId'];
  const params = { title, description, category, priority, location, userId: req.user.id };

  if (await hasColumn('tickets', 'category_id')) {
    fields.splice(3, 0, 'category_id');
    values.splice(3, 0, ':categoryId');
    params.categoryId = categoryRow.id;
  }

  if (await hasColumn('tickets', 'broadcaster_id')) {
    fields.splice(fields.length - 1, 0, 'broadcaster_id');
    values.splice(values.length - 1, 0, ':broadcasterId');
    params.broadcasterId = broadcasterId;
  }

  if (await hasColumn('tickets', 'problem_type')) {
    fields.splice(fields.length - 1, 0, 'problem_type');
    values.splice(values.length - 1, 0, ':problemType');
    params.problemType = problemType;
  }

  if (await hasColumn('tickets', 'affected_environment')) {
    fields.splice(fields.length - 1, 0, 'affected_environment');
    values.splice(values.length - 1, 0, ':affectedEnvironment');
    params.affectedEnvironment = affectedEnvironment;
  }

  if (await hasColumn('tickets', 'affected_equipment')) {
    fields.splice(fields.length - 1, 0, 'affected_equipment');
    values.splice(values.length - 1, 0, ':affectedEquipment');
    params.affectedEquipment = affectedEquipment;
  }

  if (await hasColumn('tickets', 'patrimony_number')) {
    fields.splice(fields.length - 1, 0, 'patrimony_number');
    values.splice(values.length - 1, 0, ':patrimonyNumber');
    params.patrimonyNumber = patrimonyNumber;
  }

  if (await hasColumn('tickets', 'attachments')) {
    fields.splice(fields.length - 1, 0, 'attachments');
    values.splice(values.length - 1, 0, ':attachments');
    params.attachments = attachments.length ? JSON.stringify(attachments) : null;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO tickets (${fields.join(', ')})
       VALUES (${values.join(', ')})`,
      params
    );

    if (attachments.length && (await hasColumn('ticket_attachments', 'file_data'))) {
      for (const attachment of attachments) {
        await connection.execute(
          `INSERT INTO ticket_attachments (
             ticket_id,
             uploaded_by,
             file_name,
             original_name,
             mime_type,
             extension,
             file_size,
             file_data
           )
           VALUES (
             :ticketId,
             :uploadedBy,
             :fileName,
             :originalName,
             :mimeType,
             :extension,
             :fileSize,
             :fileData
           )`,
          {
            ticketId: result.insertId,
            uploadedBy: req.user.id,
            fileName: `${result.insertId}_${Date.now()}_${attachment.name}`,
            originalName: attachment.name,
            mimeType: attachment.mime_type,
            extension: attachment.name.includes('.') ? attachment.name.split('.').pop() : null,
            fileSize: Number(attachment.size_kb || 0) * 1024,
            fileData: attachment.data_base64
          }
        );
      }
    }

    await connection.execute(
      `INSERT INTO ticket_updates (ticket_id, user_id, message, is_internal)
       VALUES (:ticketId, :userId, :message, 0)`,
      {
        ticketId: result.insertId,
        userId: req.user.id,
        message: 'Chamado aberto pelo usuario.'
      }
    );

    await connection.commit();

    const ticket = await fetchTicket(result.insertId);
    const tableAttachments = await fetchTicketAttachments(result.insertId);
    if (tableAttachments.length) {
      ticket.attachments = tableAttachments;
      ticket.has_attachments = true;
    }
    await safeSendEmail(() => sendTicketCreatedEmail(ticket));

    res.status(201).json({ message: 'Chamado aberto com sucesso.', ticket });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listTickets(req, res) {
  const where = [];
  const params = {};
  const ticketSelect = await getTicketSelect();
  const ticketsNotDeleted = await notDeletedCondition('tickets', 't');
  const hasTicketBroadcaster = await hasColumn('tickets', 'broadcaster_id');
  const hasPatrimonyNumber = await hasColumn('tickets', 'patrimony_number');

  if (!isStaff(req.user)) {
    where.push('t.user_id = :currentUserId');
    params.currentUserId = req.user.id;
  }

  const status = cleanString(req.query.status);
  const category = cleanString(req.query.category);
  const priority = cleanString(req.query.priority);
  const userId = asNullableId(req.query.user_id);
  const broadcasterId = asNullableId(req.query.broadcaster_id);
  const hasAssignedFilter = hasOwn(req.query, 'assigned_to');
  const assignedTo = hasAssignedFilter ? asNullableId(req.query.assigned_to) : undefined;
  const search = cleanString(req.query.search);
  const usePagination = hasOwn(req.query, 'page') || req.originalUrl.includes('/admin/all');
  const { page, limit, offset } = getPagination(req.query, isStaff(req.user) ? 20 : 100, isStaff(req.user) ? 50 : 200);

  if (status) {
    if (!TICKET_STATUSES.includes(status)) throw new HttpError(400, 'Status invalido.');
    where.push('t.status = :status');
    params.status = status;
  }

  if (category) {
    if (!(await categoryExists(category))) throw new HttpError(400, 'Categoria invalida.');
    where.push('t.category = :category');
    params.category = category;
  }

  if (priority) {
    if (!PRIORITIES.includes(priority)) throw new HttpError(400, 'Prioridade invalida.');
    where.push('t.priority = :priority');
    params.priority = priority;
  }

  if (isStaff(req.user) && userId) {
    where.push('t.user_id = :userId');
    params.userId = userId;
  }

  if (userId === undefined || broadcasterId === undefined) {
    throw new HttpError(400, 'Filtro invalido.');
  }

  if (isStaff(req.user) && broadcasterId) {
    where.push(hasTicketBroadcaster ? 'COALESCE(t.broadcaster_id, u.broadcaster_id) = :broadcasterId' : 'u.broadcaster_id = :broadcasterId');
    params.broadcasterId = broadcasterId;
  }

  if (isStaff(req.user) && hasAssignedFilter) {
    if (assignedTo === undefined) {
      throw new HttpError(400, 'Tecnico responsavel invalido.');
    }

    if (assignedTo === null) {
      where.push('t.assigned_to IS NULL');
    } else {
      where.push('t.assigned_to = :assignedTo');
      params.assignedTo = assignedTo;
    }
  }

  if (search) {
    where.push(hasPatrimonyNumber ? '(t.title LIKE :search OR t.description LIKE :search OR u.name LIKE :search OR t.patrimony_number LIKE :search)' : '(t.title LIKE :search OR t.description LIKE :search OR u.name LIKE :search)');
    params.search = `%${search}%`;
  }

  where.push(ticketsNotDeleted);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `${ticketSelect}
     ${whereSql}
     ORDER BY FIELD(t.status, 'Aberto', 'Em Atendimento', 'Aguardando Usuario', 'Resolvido', 'Fechado'),
              FIELD(t.priority, 'Urgente', 'Alta', 'Media', 'Baixa'),
              t.updated_at DESC
     LIMIT ${limit}
     ${usePagination ? `OFFSET ${offset}` : ''}`,
    params
  );

  const tickets = rows.map(normalizeTicket);

  if (!usePagination) {
    res.json({ tickets, data: tickets });
    return;
  }

  const [[count]] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM tickets t
     INNER JOIN users u ON u.id = t.user_id
     ${whereSql}`,
    params
  );

  res.json({ tickets, data: tickets, meta: getMeta(Number(count.total || 0), page, limit) });
}

export async function getTicket(req, res) {
  const ticket = await ensureTicketAccess(req.params.id, req.user);
  const tableAttachments = await fetchTicketAttachments(ticket.id);
  if (tableAttachments.length) {
    ticket.attachments = tableAttachments;
    ticket.has_attachments = true;
  }
  const userRole = (await hasColumn('users', 'role_id')) ? 'COALESCE(r.name, u.role)' : 'u.role';
  const roleJoin = (await hasColumn('users', 'role_id')) ? 'LEFT JOIN roles r ON r.id = u.role_id' : '';

  const [updates] = await pool.execute(
    `SELECT
       tu.id,
       tu.ticket_id,
       tu.user_id,
       tu.message,
       tu.is_internal,
       tu.created_at,
       u.name AS user_name,
       ${userRole} AS user_role
     FROM ticket_updates tu
     INNER JOIN users u ON u.id = tu.user_id
     ${roleJoin}
     WHERE tu.ticket_id = :ticketId
       ${isStaff(req.user) ? '' : 'AND tu.is_internal = 0'}
     ORDER BY tu.created_at ASC`,
    { ticketId: ticket.id }
  );

  res.json({ ...ticket, ticket, updates });
}

export async function addTicketUpdate(req, res) {
  const ticket = await ensureTicketAccess(req.params.id, req.user);
  const message = cleanString(req.body.message);
  const isInternal = isStaff(req.user) && Boolean(req.body.is_internal);
  const userRole = (await hasColumn('users', 'role_id')) ? 'COALESCE(r.name, u.role)' : 'u.role';
  const roleJoin = (await hasColumn('users', 'role_id')) ? 'LEFT JOIN roles r ON r.id = u.role_id' : '';

  if (ticket.status === 'Fechado') {
    throw new HttpError(422, 'Chamados fechados nao aceitam comentarios. Reabra o chamado antes.');
  }

  if (!message || message.length < 3) {
    throw new HttpError(400, 'Informe uma observacao com pelo menos 3 caracteres.');
  }

  const [result] = await pool.execute(
    `INSERT INTO ticket_updates (ticket_id, user_id, message, is_internal)
     VALUES (:ticketId, :userId, :message, :isInternal)`,
    {
      ticketId: ticket.id,
      userId: req.user.id,
      message,
      isInternal: isInternal ? 1 : 0
    }
  );

  const [rows] = await pool.execute(
    `SELECT
       tu.id,
       tu.ticket_id,
       tu.user_id,
       tu.message,
       tu.is_internal,
       tu.created_at,
       u.name AS user_name,
       ${userRole} AS user_role
     FROM ticket_updates tu
     INNER JOIN users u ON u.id = tu.user_id
     ${roleJoin}
     WHERE tu.ticket_id = :ticketId
     ORDER BY tu.created_at ASC`,
    { ticketId: ticket.id }
  );

  const updates = isStaff(req.user) ? rows : rows.filter((update) => !update.is_internal);
  const update = updates.find((item) => Number(item.id) === Number(result.insertId));

  res.status(201).json({ message: 'Comentario adicionado.', update, updates });
}

export async function updateTicket(req, res) {
  const currentTicket = await ensureTicketAccess(req.params.id, req.user);
  const nextStatus = cleanString(req.body.status);
  const hasAssignedTo = hasOwn(req.body, 'assigned_to');
  const assignedTo = hasAssignedTo ? asNullableId(req.body.assigned_to) : undefined;
  const publicMessage = cleanString(req.body.message);
  const internalMessage = cleanString(req.body.internal_message);

  const fields = [];
  const params = { ticketId: currentTicket.id };
  let statusChanged = false;
  let assignedChanged = false;

  if (nextStatus) {
    if (!TICKET_STATUSES.includes(nextStatus)) {
      throw new HttpError(400, 'Status invalido.');
    }

    if (nextStatus !== currentTicket.status) {
      fields.push('status = :status');
      params.status = nextStatus;
      if (await hasColumn('tickets', 'closed_at')) {
        fields.push(nextStatus === 'Fechado' ? 'closed_at = UTC_TIMESTAMP()' : 'closed_at = NULL');
      }
      statusChanged = true;
    }
  }

  if (hasAssignedTo) {
    if (assignedTo === undefined) {
      throw new HttpError(400, 'Tecnico invalido.');
    }

    if (assignedTo !== null) {
      const hasRoleId = await hasColumn('users', 'role_id');
      const [admins] = await pool.execute(
        `SELECT id, name
         FROM users u
         ${hasRoleId ? 'LEFT JOIN roles r ON r.id = u.role_id' : ''}
         WHERE u.id = :id
           AND ${hasRoleId ? 'COALESCE(r.name, u.role)' : 'u.role'} IN ('admin', 'tecnico', 'supervisor')
           AND u.is_active = 1
         LIMIT 1`,
        { id: assignedTo }
      );

      if (!admins.length) {
        throw new HttpError(400, 'Tecnico responsavel invalido ou inativo.');
      }
    }

    if (Number(assignedTo || 0) !== Number(currentTicket.assigned_to || 0)) {
      fields.push('assigned_to = :assignedTo');
      params.assignedTo = assignedTo;
      assignedChanged = true;
    }
  }

  if (!fields.length && !publicMessage && !internalMessage) {
    throw new HttpError(400, 'Nenhuma alteracao informada.');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (fields.length) {
      await connection.execute(
        `UPDATE tickets
         SET ${fields.join(', ')}
         WHERE id = :ticketId`,
        params
      );
    }

    if (statusChanged) {
      await connection.execute(
        `INSERT INTO ticket_updates (ticket_id, user_id, message, is_internal)
         VALUES (:ticketId, :userId, :message, 0)`,
        {
          ticketId: currentTicket.id,
          userId: req.user.id,
          message: `Status alterado de "${currentTicket.status}" para "${nextStatus}".`
        }
      );

      if (await hasColumn('ticket_status_history', 'new_status')) {
        await connection.execute(
          `INSERT INTO ticket_status_history (ticket_id, changed_by, old_status, new_status, comment)
           VALUES (:ticketId, :userId, :oldStatus, :newStatus, :comment)`,
          {
            ticketId: currentTicket.id,
            userId: req.user.id,
            oldStatus: currentTicket.status,
            newStatus: nextStatus,
            comment: publicMessage || null
          }
        );
      }
    }

    if (assignedChanged) {
      await connection.execute(
        `INSERT INTO ticket_updates (ticket_id, user_id, message, is_internal)
         VALUES (:ticketId, :userId, :message, 1)`,
        {
          ticketId: currentTicket.id,
          userId: req.user.id,
          message: assignedTo
            ? `Chamado direcionado para o tecnico #${assignedTo}.`
            : 'Responsavel removido do chamado.'
        }
      );
    }

    if (publicMessage) {
      await connection.execute(
        `INSERT INTO ticket_updates (ticket_id, user_id, message, is_internal)
         VALUES (:ticketId, :userId, :message, 0)`,
        {
          ticketId: currentTicket.id,
          userId: req.user.id,
          message: publicMessage
        }
      );
    }

    if (internalMessage) {
      await connection.execute(
        `INSERT INTO ticket_updates (ticket_id, user_id, message, is_internal)
         VALUES (:ticketId, :userId, :message, 1)`,
        {
          ticketId: currentTicket.id,
          userId: req.user.id,
          message: internalMessage
        }
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const updatedTicket = await fetchTicket(currentTicket.id);

  if (statusChanged) {
    await safeSendEmail(() => sendStatusUpdatedEmail(updatedTicket, currentTicket.status));
  }

  res.json({ ticket: updatedTicket });
}

export async function reopenTicket(req, res) {
  const ticket = await ensureTicketAccess(req.params.id, req.user);
  const message = cleanString(req.body.message);

  if (ticket.status !== 'Fechado') {
    throw new HttpError(422, 'Apenas chamados fechados podem ser reabertos.');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE tickets
       SET status = 'Aberto',
           closed_at = NULL
       WHERE id = :id`,
      { id: ticket.id }
    );

    await connection.execute(
      `INSERT INTO ticket_updates (ticket_id, user_id, message, is_internal)
       VALUES (:ticketId, :userId, :message, 0)`,
      {
        ticketId: ticket.id,
        userId: req.user.id,
        message: message || 'Chamado reaberto pelo usuario.'
      }
    );

    await connection.execute(
      `INSERT INTO ticket_status_history (ticket_id, changed_by, old_status, new_status, comment)
       VALUES (:ticketId, :userId, :oldStatus, 'Aberto', :comment)`,
      {
        ticketId: ticket.id,
        userId: req.user.id,
        oldStatus: ticket.status,
        comment: message || 'Chamado reaberto pelo usuario.'
      }
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const updatedTicket = await fetchTicket(ticket.id);
  res.json({ message: 'Chamado reaberto.', ticket: updatedTicket });
}

export async function updateTicketStatus(req, res) {
  req.body = { status: req.body.status, message: req.body.message };
  await updateTicket(req, res);
}

export async function assignTicket(req, res) {
  req.body = { assigned_to: hasOwn(req.body, 'assigned_to') ? req.body.assigned_to : null };
  await updateTicket(req, res);
}

export async function addInternalNote(req, res) {
  req.body = { message: req.body.message, is_internal: true };
  await addTicketUpdate(req, res);
}

export async function deleteTicket(req, res) {
  const id = asId(req.params.id);
  if (!id) throw new HttpError(400, 'Chamado invalido.');

  const [result] = await pool.execute(
    `UPDATE tickets
     SET deleted_at = UTC_TIMESTAMP()
     WHERE id = :id`,
    { id }
  );
  if (!result.affectedRows) throw new HttpError(404, 'Chamado nao encontrado.');

  res.json({ message: 'Chamado removido.' });
}

export async function getMetrics(_req, res) {
  const ticketsNotDeleted = await notDeletedCondition('tickets', 't');

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

  res.json({
    summary: {
      total: Number(summary.total || 0),
      aberto: Number(summary.aberto || 0),
      em_atendimento: Number(summary.em_atendimento || 0),
      aguardando_usuario: Number(summary.aguardando_usuario || 0),
      resolvido: Number(summary.resolvido || 0),
      fechado: Number(summary.fechado || 0)
    },
    byCategory,
    byPriority
  });
}
