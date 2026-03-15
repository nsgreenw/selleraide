export function sanitizeNextPath(nextPath: string | null | undefined): string | null {
  if (!nextPath) return null;
  if (!nextPath.startsWith("/")) return null;
  if (nextPath.startsWith("//")) return null;

  return nextPath;
}

export function buildAuthHref(basePath: string, nextPath: string | null | undefined): string {
  const safeNextPath = sanitizeNextPath(nextPath);
  if (!safeNextPath) return basePath;

  return `${basePath}?next=${encodeURIComponent(safeNextPath)}`;
}
