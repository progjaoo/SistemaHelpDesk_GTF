import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

const hasSmtpConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  : null;

const from = process.env.SMTP_FROM || 'Sistema de Chamados GTF <nao-responda@grupogtf.com.br>';
const supportEmail = process.env.TI_EMAIL || process.env.SUPPORT_EMAIL || 'ti@grupogtf.com.br';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderTicketSummary(ticket) {
  return [
    `Chamado #${ticket.id}`,
    `Titulo: ${ticket.title}`,
    `Categoria: ${ticket.category}`,
    `Prioridade: ${ticket.priority}`,
    `Status: ${ticket.status}`,
    `Localizacao/Setor: ${ticket.location}`,
    `Solicitante: ${ticket.user_name || ''} <${ticket.user_email || ''}>`,
    '',
    ticket.description
  ].join('\n');
}

async function sendMail(message) {
  const [result] = await pool.execute(
    `INSERT INTO email_queue (recipient, subject, body_html, body_text, status)
     VALUES (:recipient, :subject, :bodyHtml, :bodyText, 'pending')`,
    {
      recipient: message.to,
      subject: message.subject,
      bodyHtml: message.html || null,
      bodyText: message.text || null
    }
  );

  if (!transporter) {
    console.info('[email:dev]', {
      to: message.to,
      subject: message.subject
    });
    await pool.execute(
      `UPDATE email_queue
       SET status = 'sent',
           sent_at = UTC_TIMESTAMP()
       WHERE id = :id`,
      { id: result.insertId }
    );
    return;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await pool.execute(
        `UPDATE email_queue
         SET status = 'processing',
             retries = :retries
         WHERE id = :id`,
        { id: result.insertId, retries: attempt }
      );

      await transporter.sendMail({
        from,
        ...message
      });

      await pool.execute(
        `UPDATE email_queue
         SET status = 'sent',
             sent_at = UTC_TIMESTAMP(),
             last_error = NULL
         WHERE id = :id`,
        { id: result.insertId }
      );
      return;
    } catch (error) {
      await pool.execute(
        `UPDATE email_queue
         SET status = :status,
             retries = :retries,
             last_error = :lastError
         WHERE id = :id`,
        {
          id: result.insertId,
          status: attempt >= 2 ? 'failed' : 'pending',
          retries: attempt + 1,
          lastError: error.message
        }
      );

      if (attempt >= 2) throw error;
    }
  }
}

export async function sendTicketCreatedEmail(ticket) {
  const subject = `Novo chamado #${ticket.id} - ${ticket.title}`;
  const text = renderTicketSummary(ticket);
  const ticketUrl = `${frontendUrl}/tickets/${ticket.id}`;
  const adminUrl = `${frontendUrl}/admin/tickets/${ticket.id}`;
  const html = `
    <div style=\"font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#0f172a\">
      <div style=\"background:#0f172a;color:#fff;padding:20px;border-radius:12px 12px 0 0\">
        <h1 style=\"margin:0;font-size:22px\">GTF Help Desk</h1>
        <p style=\"margin:6px 0 0\">Novo chamado #${ticket.id}</p>
      </div>
      <div style=\"border:1px solid #e2e8f0;border-top:0;padding:20px;border-radius:0 0 12px 12px\">
        <h2 style=\"margin-top:0\">${escapeHtml(ticket.title)}</h2>
        <table style=\"width:100%;border-collapse:collapse\">
          <tr><td><strong>Categoria</strong></td><td>${escapeHtml(ticket.category)}</td></tr>
          <tr><td><strong>Prioridade</strong></td><td>${escapeHtml(ticket.priority)}</td></tr>
          <tr><td><strong>Status</strong></td><td>${escapeHtml(ticket.status)}</td></tr>
          <tr><td><strong>Localização</strong></td><td>${escapeHtml(ticket.location)}</td></tr>
          <tr><td><strong>Solicitante</strong></td><td>${escapeHtml(ticket.user_name)} &lt;${escapeHtml(ticket.user_email)}&gt;</td></tr>
          <tr><td><strong>Abertura</strong></td><td>${escapeHtml(ticket.created_at)}</td></tr>
        </table>
        <p style=\"white-space:pre-line\">${escapeHtml(ticket.description)}</p>
        <p><a href=\"${adminUrl}\" style=\"background:#2563eb;color:#fff;padding:10px 14px;text-decoration:none;border-radius:8px\">Abrir no painel</a></p>
      </div>
    </div>
  `;

  await Promise.all([
    sendMail({
      to: supportEmail,
      subject,
      text,
      html
    }),
    sendMail({
      to: ticket.user_email,
      subject: `Confirmacao do chamado #${ticket.id}`,
      text: `${text}\n\nRecebemos sua solicitacao e a equipe de TI acompanhara o atendimento.\n${ticketUrl}`,
      html: html.replace('Novo chamado', 'Chamado recebido').replace(adminUrl, ticketUrl)
    })
  ]);
}

export async function sendStatusUpdatedEmail(ticket, previousStatus) {
  const ticketUrl = `${frontendUrl}/tickets/${ticket.id}`;
  await sendMail({
    to: ticket.user_email,
    subject: `Status atualizado - chamado #${ticket.id}`,
    text: [
      `O status do chamado #${ticket.id} foi alterado.`,
      `De: ${previousStatus}`,
      `Para: ${ticket.status}`,
      '',
      `Titulo: ${ticket.title}`,
      `Acompanhe em: ${ticketUrl}`
    ].join('\n'),
    html: `
      <div style=\"font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#0f172a\">
        <h2>Chamado #${ticket.id} atualizado</h2>
        <p>O status do chamado <strong>${escapeHtml(ticket.title)}</strong> foi alterado.</p>
        <p><strong>De:</strong> ${escapeHtml(previousStatus)}<br><strong>Para:</strong> ${escapeHtml(ticket.status)}</p>
        <p><a href=\"${ticketUrl}\" style=\"background:#2563eb;color:#fff;padding:10px 14px;text-decoration:none;border-radius:8px\">Ver chamado</a></p>
      </div>
    `
  });
}

export async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  await sendMail({
    to: user.email,
    subject: 'Redefinicao de senha - Sistema de Chamados GTF',
    text: [
      `Ola, ${user.name}.`,
      '',
      'Use o link abaixo para redefinir sua senha. Ele expira em 1 hora.',
      resetUrl,
      '',
      'Se voce nao solicitou a redefinicao, ignore este e-mail.'
    ].join('\n')
  });
}
