export const statuses = [
  'Aberto',
  'Em Atendimento',
  'Aguardando Usuario',
  'Resolvido',
  'Fechado'
];

export const priorities = ['Baixa', 'Media', 'Alta', 'Urgente'];

export const defaultCategories = [
  'Radio',
  'Computador',
  'Impressora',
  'Rede',
  'Software',
  'Outro'
];

export const statusLabels = {
  Aberto: 'Aberto',
  'Em Atendimento': 'Em atendimento',
  'Aguardando Usuario': 'Aguardando usuário',
  Resolvido: 'Resolvido',
  Fechado: 'Fechado'
};

export const priorityLabels = {
  Baixa: 'Baixa',
  Media: 'Média',
  Alta: 'Alta',
  Urgente: 'Urgente'
};

export const categoryLabels = {
  Radio: 'Rádio',
  Computador: 'Computador',
  Impressora: 'Impressora',
  Rede: 'Rede',
  Software: 'Software',
  Outro: 'Outro'
};

export function labelFor(map, value) {
  return map[value] || value || '-';
}

export function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}
