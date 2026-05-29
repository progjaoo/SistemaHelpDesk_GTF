# PROMPT PARA WINDSURF — REFATORAÇÃO E MIGRAÇÃO DO BANCO DE DADOS DO SISTEMA HELP DESK

Preciso que você atue como um Arquiteto de Banco de Dados Sênior especializado em MySQL 8, sistemas corporativos Help Desk, autenticação multiusuário e aplicações escaláveis.

Analise a estrutura atual do banco de dados do sistema Help Desk e gere TODAS as queries SQL necessárias para realizar uma atualização arquitetural completa do banco.

IMPORTANTE:

* NÃO remover dados existentes.
* Criar migrations seguras.
* Preservar compatibilidade.
* Fazer migração progressiva.
* Utilizar MySQL 8.
* Utilizar ENGINE=InnoDB.
* Utilizar utf8mb4_unicode_ci.
* Todas as tabelas devem possuir:

  * created_at
  * updated_at (quando aplicável)
* Todas Foreign Keys devem possuir índices.
* Gerar queries organizadas por etapas.
* Comentar cada etapa.
* Não gerar pseudocódigo.
* Quero SQL REAL pronto para execução.

---

# OBJETIVOS DA REFATORAÇÃO

Precisamos transformar o banco atual em uma arquitetura corporativa moderna, escalável e preparada para:

* Multi login
* Controle avançado de permissões
* Tickets com anexos
* Histórico de alterações
* Auditoria
* Sistema de notificações
* SMTP assíncrono
* Escalabilidade futura
* Melhor integridade relacional
* Melhor performance

---

# 1. REFATORAR RELACIONAMENTO DE CATEGORIAS

Atualmente:

* tickets.category é VARCHAR
* FK aponta para categories.name

Isso deve ser corrigido.

### O que precisa ser feito:

* Criar coluna:

  * category_id BIGINT UNSIGNED
* Migrar os dados automaticamente:

  * tickets.category → categories.id
* Criar Foreign Key correta:

  * tickets.category_id → categories.id
* Remover FK antiga
* Remover coluna antiga category
* Criar índices adequados

---

# 2. CRIAR SISTEMA DE ROLES ESCALÁVEL

Atualmente:

* users.role usa ENUM(admin, user)

Precisamos substituir por arquitetura profissional.

### Criar tabela:

roles

* id
* name
* description
* created_at

### Inserir roles padrão:

* admin
* tecnico
* user
* supervisor

### Atualizar users:

* adicionar role_id
* migrar ENUM atual para role_id
* criar FK
* remover coluna role ENUM

---

# 3. IMPLEMENTAR SISTEMA DE SESSÕES MULTI LOGIN

Criar tabela:
user_sessions

Campos:

* id
* user_id
* refresh_token_hash
* device_info
* ip_address
* user_agent
* expires_at
* revoked_at
* created_at

Objetivo:

* permitir múltiplas sessões simultâneas
* múltiplas abas
* persistência após F5
* refresh token seguro

Criar índices ideais para autenticação.

---

# 4. REMOVER ATTACHMENTS JSON DA TABELA TICKETS

Atualmente:

* tickets.attachments JSON

Isso deve ser refatorado.

### Criar tabela:

ticket_attachments

Campos:

* id
* ticket_id
* uploaded_by
* file_name
* original_name
* mime_type
* extension
* file_size
* file_data LONGTEXT
* created_at

### Regras:

* Migrar dados existentes do JSON se houver
* Criar Foreign Keys
* Criar índices
* Remover coluna JSON antiga após migração

---

# 5. IMPLEMENTAR ANEXOS EM COMENTÁRIOS

Criar tabela:
ticket_update_attachments

Campos:

* id
* ticket_update_id
* uploaded_by
* file_name
* mime_type
* extension
* file_size
* file_data LONGTEXT
* created_at

Objetivo:

* permitir técnicos anexarem imagens/vídeos nos comentários

---

# 6. IMPLEMENTAR HISTÓRICO DE STATUS DOS CHAMADOS

Criar tabela:
ticket_status_history

Campos:

* id
* ticket_id
* changed_by
* old_status
* new_status
* comment
* created_at

Objetivo:

* auditoria
* rastreabilidade
* timeline do ticket

Criar índices otimizados.

---

# 7. IMPLEMENTAR SISTEMA DE NOTIFICAÇÕES

Criar tabela:
notifications

Campos:

* id
* user_id
* type
* title
* message
* is_read
* metadata JSON
* created_at

Objetivo:

* notificações internas
* alertas
* updates de tickets

Criar índices apropriados.

---

# 8. IMPLEMENTAR FILA DE EMAILS SMTP

Criar tabela:
email_queue

Campos:

* id
* recipient
* subject
* body_html
* body_text
* status
* retries
* last_error
* sent_at
* created_at

Status possíveis:

* pending
* processing
* sent
* failed

Objetivo:

* envio assíncrono de emails
* evitar lentidão nas requests

Criar índices de fila.

---

# 9. IMPLEMENTAR AUDITORIA GERAL

Criar tabela:
audit_logs

Campos:

* id
* user_id
* action
* table_name
* record_id
* old_data JSON
* new_data JSON
* ip_address
* user_agent
* created_at

Objetivo:

* rastrear alterações críticas
* auditoria corporativa
* segurança

---

# 10. MELHORAR TABELA USERS

Adicionar campos:

* phone
* avatar_base64 LONGTEXT
* last_login_at
* last_login_ip
* failed_login_attempts
* locked_until
* email_verified_at
* deleted_at

Criar índices necessários.

---

# 11. MELHORAR TABELA TICKETS

Adicionar campos:

* broadcaster_id
* sla_due_at
* first_response_at
* resolved_at
* closed_by
* deleted_at

Criar:

* Foreign Keys
* índices compostos
* índices para dashboards

---

# 12. IMPLEMENTAR SOFT DELETE

Adicionar deleted_at:

* users
* tickets
* categories
* broadcasters

Objetivo:

* exclusão lógica
* restauração futura
* auditoria

---

# 13. CRIAR TABELAS FUTURAS PARA ESCALABILIDADE

Criar:

* ticket_priorities
* ticket_statuses

Objetivo:

* eliminar ENUMs futuramente

Inserir dados padrão.

---

# 14. VALIDAR PERFORMANCE

Gerar:

* índices compostos inteligentes
* índices para filtros frequentes
* índices para dashboards
* índices para consultas administrativas

---

# 15. ORGANIZAÇÃO DAS MIGRATIONS

Gerar SQL separado por etapas:

### Exemplo:

* STEP 01
* STEP 02
* STEP 03

Cada etapa deve conter:

* comentários
* validações
* ALTER TABLE
* CREATE TABLE
* UPDATE
* índices
* foreign keys

---

# IMPORTANTE

Quero:

* SQL COMPLETO
* SQL REAL
* SEM EXPLICAÇÕES GENÉRICAS
* SEM PSEUDOCÓDIGO
* SEM RESUMOS
* SEM OMITIR QUERIES

O resultado deve ser um script profissional de migração de banco de dados pronto para execução em produção.
