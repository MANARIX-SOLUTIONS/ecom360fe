/**
 * Roles and permissions for the app.
 * SuperAdmin = backoffice only. Propriétaire = full store. Gestionnaire = ops. Caissier = POS + limited.
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  PROPRIETAIRE: 'proprietaire',
  GESTIONNAIRE: 'gestionnaire',
  CAISSIER: 'caissier',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/** Permission keys used in the app and nav */
export type Permission =
  | 'backoffice'
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'clients'
  | 'suppliers'
  | 'expenses'
  | 'reports'
  | 'settings'
  | 'settings:stores'
  | 'settings:profile'
  | 'settings:subscription'
  | 'settings:users'
  | 'settings:security'

const PERMISSIONS_BY_ROLE: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: [
    'backoffice',
    'dashboard',
    'pos',
    'products',
    'clients',
    'suppliers',
    'expenses',
    'reports',
    'settings',
    'settings:stores',
    'settings:profile',
    'settings:subscription',
    'settings:users',
    'settings:security',
  ],
  [ROLES.PROPRIETAIRE]: [
    'dashboard',
    'pos',
    'products',
    'clients',
    'suppliers',
    'expenses',
    'reports',
    'settings',
    'settings:stores',
    'settings:profile',
    'settings:subscription',
    'settings:users',
    'settings:security',
  ],
  [ROLES.GESTIONNAIRE]: [
    'dashboard',
    'pos',
    'products',
    'clients',
    'suppliers',
    'expenses',
    'reports',
    'settings',
    'settings:profile',
    'settings:security',
  ],
  [ROLES.CAISSIER]: ['dashboard', 'pos', 'products', 'clients'],
}

export function getPermissions(role: Role): Permission[] {
  return PERMISSIONS_BY_ROLE[role] ?? []
}

export function can(role: Role, permission: Permission): boolean {
  return getPermissions(role).includes(permission)
}
