export interface Segment {
  text: string;
  marked: boolean;
}

export function highlight(body: string, quotes: readonly string[]): Segment[] {
  const ranges = quotes
    .map((quote) => quote.trim())
    .filter((quote) => quote.length > 0)
    .flatMap((quote) => {
      const start = body.indexOf(quote);
      return start === -1 ? [] : [{ start, end: start + quote.length }];
    })
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const { start, end } of ranges) {
    if (end <= cursor) continue;
    const from = Math.max(start, cursor);
    if (from > cursor) segments.push({ text: body.slice(cursor, from), marked: false });
    segments.push({ text: body.slice(from, end), marked: true });
    cursor = end;
  }
  if (cursor < body.length) segments.push({ text: body.slice(cursor), marked: false });
  return segments;
}
