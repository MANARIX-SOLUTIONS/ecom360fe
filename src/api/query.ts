/**
 * Build a `?a=1&b=2` suffix, skipping empty values.
 * `false` and `0` are kept so boolean/numeric flags reach the API.
 */
export function toQuery(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
