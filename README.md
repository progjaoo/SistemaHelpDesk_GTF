# Sistema de Chamados GTF

Implementacao do MVP descrito no PRD `sistema-chamados.md`.

## Estrutura

- `front-end/`: React 18 + Vite + TailwindCSS
- `api/`: Node.js + Express + MySQL
- `banco-de-dados/`: scripts SQL de schema e seed

## Execucao local

1. Importe `banco-de-dados/schema.sql` no MySQL.
2. Opcionalmente importe `banco-de-dados/seed.sql`.
3. Configure `api/.env` a partir de `api/.env.example`.
4. Configure `front-end/.env` a partir de `front-end/.env.example`.
5. Rode a API com `npm run dev` dentro de `api/`.
6. Rode o front-end com `npm run dev` dentro de `front-end/`.

Usuario seed:

- E-mail: `admin@grupogtf.com.br`
- Senha: `password`