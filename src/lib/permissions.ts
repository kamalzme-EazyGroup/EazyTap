export const FEATURES = [
  { key: 'cards', label: 'Business cards' },
  { key: 'themes', label: 'Custom themes' },
  { key: 'qr', label: 'QR customization' },
  { key: 'fonts', label: 'Font styles' },
  { key: 'templates', label: 'Card templates' },
] as const;
export const ACTIONS = ['view', 'add', 'edit', 'delete'] as const;
export type Feature = typeof FEATURES[number]['key'];
export type Action = typeof ACTIONS[number];
export type Grants = Record<Action, boolean>;
export type Permissions = Record<Feature, Grants>;
export type Access = { isSuperAdmin: boolean; permissions: Permissions };
export function emptyPermissions(allow = false): Permissions {
  return Object.fromEntries(FEATURES.map(({key}) => [key, Object.fromEntries(ACTIONS.map(a => [a, allow]))])) as Permissions;
}
export function can(access: Access, feature: Feature, action: Action) {
  return access.isSuperAdmin || (access.permissions[feature].view && access.permissions[feature][action]);
}
export function customizationAction(previous: string, next: string, baseline: string): Action {
  return next === baseline ? 'delete' : previous === baseline ? 'add' : 'edit';
}