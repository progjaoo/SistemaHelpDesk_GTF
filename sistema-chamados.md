# PRD — Sistema de Chamados GTF
**Produto:** Help Desk Interno  
**Empresa:** Grupo GTF  
**Versão:** 1.0  
**Data:** Maio 2026  
**Status:** Em definição

---

## 1. Visão Geral

O Sistema de Chamados GTF é uma aplicação web interna para gestão de solicitações de suporte de TI. O objetivo é centralizar e organizar chamados de suporte (problemas de rádio, manutenção de computador, rede, etc.), substituindo comunicação informal por e-mail/WhatsApp por um fluxo estruturado e rastreável.

**Stack tecnológica:** React (frontend) + Node.js/Express (API REST) + MySQL (banco de dados)  
**Publicação:** Locaweb — pasta `/dist` do React servida como site estático; backend como Node.js ou PHP; banco MySQL nativo da hospedagem.

---

## 2. Problema a Resolver

- Chamados de suporte chegam de forma desorganizada (WhatsApp, e-mail avulso, telefone)
- Sem rastreabilidade de quem abriu, quem atendeu e qual foi a solução
- Sem priorização ou categorização de problemas
- Equipe de TI sem visibilidade clara da fila de trabalho

---

## 3. Usuários e Perfis

### 3.1 Usuário Comum
- Funcionário da empresa
- Abre chamados, acompanha o status e recebe notificações por e-mail
- Não tem acesso ao painel administrativo

### 3.2 Administrador (TI)
- Membro da equipe de TI
- Gerencia todos os chamados, usuários e permissões
- Atribui e direciona chamados
- Tem acesso total ao sistema

---

## 4. Requisitos Funcionais

### 4.1 Autenticação e Conta

| ID | Requisito | Prioridade |
|----|-----------|------------|
| AUTH-01 | Login com e-mail e senha | Alta |
| AUTH-02 | Cadastro de novo usuário (nome, e-mail, senha, radioquetrabalha) | Alta |
| AUTH-03 | Redefinição de senha via link enviado por e-mail | Alta |
| AUTH-04 | Sessão com JWT (token expira em 8h) | Alta |
| AUTH-05 | Logout | Alta |

### 4.2 Painel do Usuário Comum

| ID | Requisito | Prioridade |
|----|-----------|------------|
| USR-01 | Abrir novo chamado com formulário estruturado | Alta |
| USR-02 | Listar os próprios chamados com filtro por status | Alta |
| USR-03 | Visualizar detalhes e histórico de atualizações do chamado | Alta |
| USR-04 | Receber e-mail de confirmação ao abrir chamado | Alta |
| USR-05 | Receber e-mail quando o status do chamado for atualizado | Média |
| USR-06 | Adicionar comentário/observação em chamado já aberto | Média |

### 4.3 Formulário de Abertura de Chamado

Campos obrigatórios:
- **Categoria:** Rádio / Manutenção de Computador / Rede / Software / Impressora / Outro
- **Prioridade:** Baixa / Média / Alta / Urgente
- **Título** (texto curto)
- **Descrição detalhada** (textarea)
- **Localização/Setor** (preenchido automaticamente pelo perfil, editável)

### 4.4 Painel do Administrador

| ID | Requisito | Prioridade |
|----|-----------|------------|
| ADM-01 | Visualizar todos os chamados com filtros (status, categoria, prioridade, usuário) | Alta |
| ADM-02 | Alterar status do chamado (Aberto → Em Atendimento → Resolvido → Fechado) | Alta |
| ADM-03 | Adicionar observações/atualizações internas ao chamado | Alta |
| ADM-04 | Direcionar chamado para outro técnico (se houver mais de um admin) | Média |
| ADM-05 | Gerenciar usuários: listar, ativar/desativar, trocar permissão (comum ↔ admin) | Alta |
| ADM-06 | Ver dashboard com métricas simples (total abertos, em atendimento, resolvidos) | Média |

### 4.5 Notificações por E-mail

Todos os e-mails vão para `ti@grupogtf.com.br` quando um usuário abre um chamado.  
O usuário recebe cópia de confirmação no próprio e-mail cadastrado.

| Evento | Destinatário |
|--------|--------------|
| Novo chamado aberto | TI (`ti@grupogtf.com.br`) + usuário (confirmação) |
| Status do chamado atualizado | Usuário que abriu |
| Redefinição de senha | Usuário solicitante |

---

## 5. Requisitos Não Funcionais

| Requisito | Detalhe |
|-----------|---------|
| Compatibilidade | Funcionar em navegadores modernos (Chrome, Firefox, Edge) |
| Responsividade | Layout adaptável para desktop e tablet |
| Segurança | Senhas com bcrypt, autenticação JWT, rotas protegidas por perfil |
| Hospedagem | Locaweb — React exportado como build estático (`/dist`), backend Node.js ou PHP API |
| Banco de dados | MySQL hospedado na própria conta Locaweb |
| E-mail | Nodemailer via SMTP (ex: Gmail, SendGrid ou SMTP da própria empresa) |

---

## 6. Arquitetura Técnica

### 6.1 Frontend (React)
```
/src
  /pages
    Login.jsx
    Register.jsx
    ForgotPassword.jsx
    ResetPassword.jsx
    Dashboard.jsx         ← usuário comum
    NewTicket.jsx
    TicketDetail.jsx
    AdminDashboard.jsx    ← admin
    AdminTickets.jsx
    AdminUsers.jsx
  /components
    TicketCard.jsx
    StatusBadge.jsx
    Navbar.jsx
  /services
    api.js                ← axios com baseURL e token JWT
  /context
    AuthContext.jsx
```

Build: `npm run build` → pasta `/dist` → publicar no Locaweb como site estático.

### 6.2 Backend (Node.js + Express)
```
/src
  /routes
    auth.js
    tickets.js
    users.js
  /middleware
    authMiddleware.js     ← verificação JWT
    adminMiddleware.js    ← verificação de perfil admin
  /services
    emailService.js       ← Nodemailer
  /controllers
    authController.js
    ticketController.js
    userController.js
  server.js
```

### 6.3 Banco de Dados (MySQL)

**Tabela `users`**
```sql
id, name, email, password_hash, role (admin|user), sector, 
is_active, reset_token, reset_token_expires, created_at
```

**Tabela `tickets`**
```sql
id, title, description, category, priority, status, 
user_id (FK), assigned_to (FK nullable), created_at, updated_at
```

**Tabela `ticket_updates`**
```sql
id, ticket_id (FK), user_id (FK), message, is_internal, created_at
```

**Tabela `categories`**
```sql
id, name, description, is_active
```

---

## 7. Fluxos Principais

### 7.1 Abertura de Chamado
1. Usuário loga → vai para Dashboard
2. Clica em "Novo Chamado"
3. Preenche formulário (categoria, prioridade, título, descrição)
4. Envia → API salva no MySQL → e-mail disparado para `ti@grupogtf.com.br`
5. Usuário recebe e-mail de confirmação
6. Chamado aparece na lista do usuário com status "Aberto"

### 7.2 Atendimento pelo Admin
1. Admin loga → vê painel com fila de chamados
2. Clica no chamado → lê detalhes
3. Atualiza status para "Em Atendimento"
4. Adiciona observações ao longo do processo
5. Ao resolver, muda status para "Resolvido"
6. Usuário recebe e-mail a cada atualização de status

### 7.3 Redefinição de Senha
1. Usuário clica em "Esqueci minha senha"
2. Informa o e-mail cadastrado
3. Recebe link com token temporário (expira em 1h)
4. Acessa o link → digita nova senha
5. Token invalidado após uso

---

## 8. Categorias de Chamado (padrão inicial)

| Categoria | Exemplos |
|-----------|---------|
| Rádio | Configuração, falha de sinal, troca de equipamento |
| Computador | Lentidão, formatação, hardware danificado |
| Impressora | Papel preso, configuração, toner |
| Rede | Sem internet, Wi-Fi, cabo |
| Software | Instalação, licença, erro em sistema |
| Outro | Demandas não categoradas acima |

---

## 9. Status do Chamado

```
Aberto → Em Atendimento → Aguardando Usuário → Resolvido → Fechado
                                ↑___________________________|
                                (usuário pode reabrir se necessário)
```

---

## 10. MVP — Escopo da Versão 1.0

### Incluído no MVP
- Login, cadastro e redefinição de senha
- Abertura e listagem de chamados
- Painel admin com gestão de chamados e usuários
- Envio de e-mail ao abrir chamado e ao atualizar status
- Dashboard com contadores básicos (admin)
- Troca de permissão de usuários

### Fora do MVP (versões futuras)
- Relatórios e exportação CSV
- Comentários com anexos (upload de imagem)
- Notificações em tempo real (WebSocket)
- SLA e alertas de prazo
- App mobile

---

## 11. Estimativa de Esforço

| Módulo | Estimativa |
|--------|-----------|
| Setup projeto (React + Node + MySQL) | 0,5 dia |
| Autenticação completa (JWT + reset senha) | 1 dia |
| CRUD de chamados (backend + frontend) | 2 dias |
| Painel Admin (chamados + usuários) | 1,5 dias |
| Envio de e-mails (Nodemailer) | 0,5 dia |
| Dashboard métricas | 0,5 dia |
| Ajustes, testes e publicação na Locaweb | 1 dia |
| **Total estimado** | **~7 dias úteis** |

---

## 12. Publicação na Locaweb

### Frontend (React)
1. `npm run build` gera a pasta `/dist`
2. Subir conteúdo da `/dist` via FTP para o diretório público da Locaweb (`/public_html` ou subdomínio)
3. Criar arquivo `.htaccess` para redirecionar todas as rotas para `index.html` (SPA):
```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

### Backend (Node.js)
- Locaweb suporta Node.js em planos específicos — verificar plano contratado
- Alternativa: reescrever backend em PHP puro para máxima compatibilidade com hospedagem compartilhada
- API rodando em subdomínio (ex: `api.sistema.grupogtf.com.br`)

### Banco de Dados
- Criar banco MySQL pelo painel Locaweb
- Importar script de criação das tabelas via phpMyAdmin

---

## 13. Dependências e Tecnologias

### Frontend
- React 18 + Vite
- React Router v6
- Axios (requisições HTTP)
- TailwindCSS (estilização)
- React Hook Form (formulários)

### Backend
- Node.js 20+
- Express.js
- mysql2 (driver MySQL)
- jsonwebtoken (JWT)
- bcryptjs (hash de senhas)
- nodemailer (envio de e-mail)
- dotenv (variáveis de ambiente)
- cors

---

## 14. Critérios de Aceite

- [ ] Usuário consegue se cadastrar, logar e redefinir senha via e-mail
- [ ] Usuário abre chamado e recebe confirmação por e-mail
- [ ] `ti@grupogtf.com.br` recebe e-mail com detalhes do chamado
- [ ] Admin visualiza todos os chamados e pode atualizar status
- [ ] Admin consegue ativar/desativar e alterar permissão de usuários
- [ ] Chamados são listados com filtro por status e categoria
- [ ] Sistema funciona publicado na Locaweb sem erros de rota (SPA + .htaccess)

---

*Documento elaborado com base nos requisitos fornecidos pela equipe GTF. Versão sujeita a revisão.*