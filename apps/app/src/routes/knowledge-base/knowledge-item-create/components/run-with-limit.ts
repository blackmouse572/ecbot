/**
 * Run `task` over `items`, at most `limit` at a time, and report how many
 * failed. One failure does not stop the others.
 */
export async function runWithLimit<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<{ failed: number }> {
  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      try {
        await task(item);
      } catch (error) {
        console.error("Batch task failed:", error);
        failed += 1;
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return { failed };
}
