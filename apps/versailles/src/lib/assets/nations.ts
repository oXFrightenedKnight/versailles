export function getNationFlagURL(nationId: string | undefined) {
  return `/flags/${nationId?.toLowerCase() ?? "tribes"}.png`;
}
