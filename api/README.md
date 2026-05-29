# API - Sistema de Chamados GTF

API REST em Node.js/Express para autenticacao, chamados, usuarios e notificacoes por e-mail.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Configure o MySQL no `.env` e importe os scripts de `../banco-de-dados`.

## Rotas principais

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `GET /api/tickets`
- `POST /api/tickets`
- `GET /api/tickets/:id`
- `POST /api/tickets/:id/updates`
- `PATCH /api/tickets/:id` somente admin
- `GET /api/tickets/metrics` somente admin
- `GET /api/users` somente admin
- `PATCH /api/users/:id` somente admin

Sem SMTP configurado, a API apenas registra os e-mails no console para facilitar desenvolvimento local.