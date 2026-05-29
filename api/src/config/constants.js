export const ROLES = ['admin', 'tecnico', 'user', 'supervisor'];

export const PRIORITIES = ['Baixa', 'Media', 'Alta', 'Urgente'];

export const TICKET_STATUSES = [
  'Aberto',
  'Em Atendimento',
  'Aguardando Usuario',
  'Resolvido',
  'Fechado'
];

export const CATEGORIES = [
  'Radio',
  'Computador',
  'Impressora',
  'Rede',
  'Software',
  'Outro'
];

export const PUBLIC_USER_FIELDS = `
  id,
  name,
  email,
  role,
  sector,
  is_active,
  created_at,
  updated_at
`;
