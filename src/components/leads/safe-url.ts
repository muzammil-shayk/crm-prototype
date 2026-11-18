export function webUrl(url: string): string | null {
  try {
    const { protocol, href } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? href : null;
  } catch {
    return null;
  }
}
