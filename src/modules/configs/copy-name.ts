const COPY_MARK = /\s+\(copy(?: (\d+))?\)$/;

export function copyName(name: string, takenNames: readonly string[], maxLength: number): string {
  const base = name.replace(COPY_MARK, "");
  const taken = new Set(takenNames);
  for (let number = 1; ; number += 1) {
    const suffix = number === 1 ? " (copy)" : ` (copy ${number})`;
    const candidate = base.slice(0, maxLength - suffix.length).trimEnd() + suffix;
    if (!taken.has(candidate)) return candidate;
  }
}
