export const ADMIN_ROLES = ['admin'];
export const STAFF_ROLES = ['admin', 'tecnico', 'supervisor'];

export function isAdmin(user) {
  return ADMIN_ROLES.includes(user?.role);
}

export function isStaff(user) {
  return STAFF_ROLES.includes(user?.role);
}
