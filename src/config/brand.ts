export const brand = {
  name: "Aurapulse",
  tagline: "A little clarity. A closer look at your heart.", // NEEDS_CONFIRMATION: placeholder original copy
  heroQuote: "Every beat is a story worth listening to.", // Original, unattributed placeholder supplied in v5
  logoStatus: "NEEDS_CONFIRMATION",
  version: "Frontend preview · 0.1",
  modelCredit: "human heart by sammite · CC BY 4.0",
  modelSource: "https://sketchfab.com/3d-models/human-heart-bc51630b88b94f5fb6bdaef1488041c3",
};

export function pageHead(page: string, description: string) {
  const title = `${brand.name} | ${page}`;
  return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
}