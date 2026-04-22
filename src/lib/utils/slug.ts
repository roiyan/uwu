const randomWord = () => Math.random().toString(36).slice(2, 8);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildCoupleSlug(bride: string, groom: string): string {
  const base = slugify(`${bride}-${groom}`) || "undangan";
  return `${base}-${randomWord()}`;
}
