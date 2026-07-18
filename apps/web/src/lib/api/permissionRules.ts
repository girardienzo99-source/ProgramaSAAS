export function permissionMatches(granted: string, required: string): boolean {
  if (granted === '*' || granted === required) return true;
  if (!granted.endsWith('.*')) return false;
  const prefix = granted.slice(0, -1);
  return required.startsWith(prefix);
}

export function hasPermission(permissions: Iterable<string>, required: string): boolean {
  for (const granted of permissions) {
    if (permissionMatches(granted, required)) return true;
  }
  return false;
}
