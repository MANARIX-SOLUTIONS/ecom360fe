/**
 * Applique la matrice écran × rôle (constants/roles) avec les permissions API.
 * Les deux conditions doivent être vraies ; pendant le chargement des permissions,
 * on s'appuie sur le rôle front pour éviter un refus transitoire injustifié.
 */
export function canAccessNav(
  roleCan: boolean,
  backendCan: boolean,
  permissionsLoading: boolean
): boolean {
  return roleCan && (permissionsLoading || backendCan);
}
