# Banco de Dados - Sistema de Chamados GTF

Scripts para MySQL 8+ ou MySQL compativel na Locaweb.

## Ordem de importacao

1. Crie o banco pelo painel da hospedagem.
2. Importe `schema.sql`.
3. Opcionalmente importe `seed.sql` para criar um administrador inicial.

Para bancos ja existentes, aplique os scripts da pasta `migrations/` na ordem numerica.

## Usuario inicial do seed

- E-mail: `admin@grupogtf.com.br`
- Senha: `password`

Altere a senha apos o primeiro login.