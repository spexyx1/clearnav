const PAGE = 1000;

interface Page<T> { data: T[] | null; error: { message: string } | null }
interface Rangeable<T> { range(from: number, to: number): PromiseLike<Page<T>> }

// Builders must have a stable order so pages never overlap or skip rows; any failed page throws instead of returning partial totals.
export async function fetchAll<T>(build: () => Rangeable<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

export async function fetchAllIn<T>(ids: string[], build: (chunk: string[]) => Rangeable<T>, chunkSize = 150): Promise<T[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize));
  return (await Promise.all(chunks.map((c) => fetchAll(() => build(c))))).flat();
}
