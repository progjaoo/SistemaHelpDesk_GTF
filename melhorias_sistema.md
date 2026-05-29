# MELHORIAS ESTRUTURAIS — SISTEMA HELP DESK INTERNO GTF

Precisamos implementar e refatorar as seguintes funcionalidades no sistema interno de Help Desk da empresa, priorizando escalabilidade, usabilidade, estabilidade de sessão e simplicidade operacional.

---

# 1. ENVIO DE EMAIL AUTOMÁTICO AO CRIAR CHAMADOS

Implementar sistema de envio automático de e-mails utilizando SMTP para simplificar integração e manutenção.

### Requisitos:

* Quando um chamado for criado, enviar automaticamente um e-mail através da conta:

  * `ti@grupogtf.com.br`
* O sistema deve utilizar SMTP autenticado.
* O e-mail deve ser enviado para:

  * Técnico responsável
  * Usuário criador do chamado
  * Grupo interno de TI (caso necessário)
* Implementar templates HTML modernos para os e-mails.
* O e-mail deve conter:

  * Número do chamado
  * Título
  * Categoria
  * Prioridade
  * Status inicial
  * Nome do usuário
  * Data/hora da abertura
  * Link direto para o ticket
* Enviar novos e-mails automaticamente quando:

  * Técnico responder
  * Status for alterado
  * Chamado for finalizado
* Criar camada de serviço isolada para envio SMTP.
* Implementar logs de falha de envio.
* Implementar retry simples em caso de falha.

---

# 2. CRUD COMPLETO DE USUÁRIOS (ADMIN)

Criar painel administrativo completo para gerenciamento de usuários.

### O ADMIN deve conseguir:

* Criar usuários
* Editar usuários
* Excluir usuários
* Ativar/desativar usuários
* Resetar senha
* Alterar permissões
* Definir tipo de usuário:

  * ADMIN
  * TÉCNICO
  * USUÁRIO COMUM

### Melhorias para usuários:

* Tela de perfil
* Atualização de dados pessoais
* Alteração de senha
* Upload de foto de perfil
* Melhor validação de formulários
* Mensagens amigáveis de erro/sucesso

### Requisitos técnicos:

* Criar controle de permissões por role.
* Implementar middleware de autorização.
* Garantir que apenas ADMIN tenha acesso às rotas administrativas.
* Melhorar UX/UI do gerenciamento de usuários.

---

# 3. CRUD DE CATEGORIAS (ADMIN)

No login de ADMIN deve existir gerenciamento completo de categorias de chamados.

### Funcionalidades:

* Criar categoria
* Atualizar categoria
* Excluir categoria
* Ativar/desativar categoria
* Reordenar categorias
* Definir cores/ícones das categorias (opcional)

### Regras:

* Apenas ADMIN pode acessar.
* As categorias devem aparecer dinamicamente na abertura do chamado.
* Não permitir exclusão de categorias vinculadas sem confirmação.

---

# 4. MELHORIAS NO LOGIN DE TÉCNICO

Os técnicos precisam possuir funcionalidades avançadas dentro dos tickets.

### Funcionalidades:

* Adicionar comentários internos e externos
* Alterar status do chamado
* Alterar prioridade
* Assumir chamados
* Encerrar chamados
* Reabrir chamados
* Anexar imagens nos comentários
* Anexar vídeos nos comentários
* Histórico completo das interações

### Status sugeridos:

* Aberto
* Em andamento
* Aguardando usuário
* Resolvido
* Fechado

### Requisitos técnicos:

* Upload com preview de imagens
* Compressão básica de imagens antes do envio
* Exibição otimizada de anexos
* Timeline visual do ticket

---

# 5. CRUD DE EMISSORAS (ADMIN)

Criar gerenciamento completo de emissoras para vinculação dos usuários.

### O ADMIN deve conseguir:

* Criar emissoras
* Editar emissoras
* Excluir emissoras
* Ativar/desativar emissoras

### Estrutura sugerida:

* Nome da emissora
* Cidade
* Estado
* Código interno
* Status

### Regras:

* Usuários devem selecionar uma emissora cadastrada ao criar/editar perfil.
* Sistema deve carregar emissoras dinamicamente.

---

# 6. REVISÃO E EXPANSÃO DOS CAMPOS DOS TICKETS

Precisamos modernizar a estrutura dos chamados.

### Adicionar suporte para:

* Upload de imagens
* Upload de vídeos
* Anexos diversos
* Comentários ricos
* Histórico completo

### Campos sugeridos:

* Título
* Descrição detalhada
* Categoria
* Prioridade
* Emissora
* Tipo de problema
* Data/hora
* Anexos
* Ambiente afetado
* Equipamento afetado

### Armazenamento:

* Utilizar Base64 inicialmente para simplificar implementação.
* Estruturar backend para futura migração para armazenamento em arquivos/cloud.

### Melhorias:

* Validar tamanho máximo dos anexos
* Compressão automática
* Preview antes do envio
* Melhor experiência mobile

---

# 7. SUPORTE A MULTI LOGIN / SESSÕES INDEPENDENTES

Atualmente o sistema não suporta múltiplos logins simultâneos em abas diferentes.

### Problema atual:

* Ao abrir outra aba e logar com outro usuário:

  * Sessão anterior é sobrescrita
  * F5 invalida autenticação anterior

### Objetivo:

Permitir múltiplas sessões independentes no navegador.

### Requisitos técnicos:

* Revisar estratégia atual de autenticação.
* Implementar autenticação baseada em:

  * JWT + Refresh Token
    OU
  * Session Storage isolado
* Cada aba deve manter sua própria sessão.
* Não compartilhar autenticação entre abas involuntariamente.
* Persistência correta após F5.
* Melhor gerenciamento de expiração de sessão.

### Segurança:

* Implementar expiração automática.
* Logout seguro.
* Proteção de rotas.
* Renovação de token automática.

---

# 8. MELHORIAS NA TELA DE ABERTURA DE CHAMADOS

A tela de abertura de chamados deve ser mais robusta, moderna e obrigatória nos campos essenciais.

### Requisitos:

* Todos os campos essenciais devem ser obrigatórios.
* Usuário deve conseguir enviar:

  * Fotos
  * Vídeos
  * Anexos

### Campos obrigatórios:

* Título
* Descrição
* Categoria
* Emissora
* Prioridade
* Tipo do problema

### Melhorias UX/UI:

* Drag and drop de arquivos
* Preview de anexos
* Indicador de upload
* Validação em tempo real
* Responsividade mobile
* Melhor organização visual

### Banco de dados:

* Ajustar tabelas para suportar anexos Base64.
* Criar tabela de anexos vinculada aos tickets.
* Preparar estrutura para futura migração para armazenamento externo.

---

# OBJETIVO GERAL

Modernizar completamente o sistema interno de Help Desk, tornando-o:

* Mais escalável
* Mais estável
* Mais intuitivo
* Mais profissional
* Compatível com múltiplos perfis
* Preparado para crescimento futuro

O sistema deve priorizar:

* Boa experiência do usuário
* Segurança
* Facilidade de manutenção
* Organização do código
* Escalabilidade futura
* Performance
* Responsividade
