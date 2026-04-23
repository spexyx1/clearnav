/**
 * Supabase query helpers.
 *
 * `must(builder)` — resolves the query and throws the Supabase error if present.
 * Use this instead of destructuring only `.data` and silently ignoring `.error`.
 *
 * Example:
 *   const data = await must(supabase.from('foo').select('*').eq('id', id).maybeSingle());
 */
export async function must<T>(
  builder: PromiseLike<{ data: T; error: { message: string } | null }>
): Promise<T> {
  const { data, error } = await builder;
  if (error) throw new Error(error.message);
  return data;
}
