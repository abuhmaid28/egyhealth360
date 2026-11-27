export type FoundationAssetRights = "PREVIEW_ATTESTED_REUSED" | "OFL_FONT_REUSED";

export interface FoundationPublicAssetEntry {
  readonly path: string;
  readonly kind: "brand-mark" | "demo-portrait" | "demo-scene" | "font" | "license";
  readonly rights: FoundationAssetRights;
  readonly previewOnly: boolean;
  readonly productionReady: boolean;
  readonly sourceRef: string;
}

export const FOUNDATION_PUBLIC_ASSETS: readonly FoundationPublicAssetEntry[] = [
  { path: "/brand/dp02/primary-en-light.svg", kind: "brand-mark", rights: "PREVIEW_ATTESTED_REUSED", previewOnly: true, productionReady: false, sourceRef: "#158" },
  { path: "/brand/dp02/primary-en-dark.svg", kind: "brand-mark", rights: "PREVIEW_ATTESTED_REUSED", previewOnly: true, productionReady: false, sourceRef: "#158" },
  { path: "/brand/dp02/primary-ar-light.svg", kind: "brand-mark", rights: "PREVIEW_ATTESTED_REUSED", previewOnly: true, productionReady: false, sourceRef: "#158" },
  { path: "/brand/dp02/primary-ar-dark.svg", kind: "brand-mark", rights: "PREVIEW_ATTESTED_REUSED", previewOnly: true, productionReady: false, sourceRef: "#158" },
  { path: "/brand/dp02/compact-en-light.svg", kind: "brand-mark", rights: "PREVIEW_ATTESTED_REUSED", previewOnly: true, productionReady: false, sourceRef: "#158" },
  { path: "/brand/dp02/compact-en-dark.svg", kind: "brand-mark", rights: "PREVIEW_ATTESTED_REUSED", previewOnly: true, productionReady: false, sourceRef: "#158" },
  { path: "/brand/dp02/compact-ar-light.svg", kind: "brand-mark", rights: "PREVIEW_ATTESTED_REUSED", previewOnly: true, productionReady: false, sourceRef: "#158" },
  { path: "/brand/dp02/compact-ar-dark.svg", kind: "brand-mark", rights: "PREVIEW_ATTESTED_REUSED", previewOnly: true, productionReady: false, sourceRef: "#158" },
  { path: "/visual-recovery/care-encounter.webp", kind: "demo-scene", rights: "PREVIEW_ATTESTED_REUSED", previewOnly: true, productionReady: false, sourceRef: "#158" },
  { path: "/visual-recovery/mariam.webp", kind: "demo-portrait", rights: "PREVIEW_ATTESTED_REUSED", previewOnly: true, productionReady: false, sourceRef: "#158" },
  { path: "/visual-recovery/omar.webp", kind: "demo-portrait", rights: "PREVIEW_ATTESTED_REUSED", previewOnly: true, productionReady: false, sourceRef: "#158" },
  { path: "/visual-recovery/sara.webp", kind: "demo-portrait", rights: "PREVIEW_ATTESTED_REUSED", previewOnly: true, productionReady: false, sourceRef: "#158" },
  { path: "/fonts/inter-latin-variable.woff2", kind: "font", rights: "OFL_FONT_REUSED", previewOnly: false, productionReady: true, sourceRef: "#158" },
  { path: "/fonts/noto-sans-arabic-variable.woff2", kind: "font", rights: "OFL_FONT_REUSED", previewOnly: false, productionReady: true, sourceRef: "#158" },
  { path: "/fonts/my-care/plex-arabic-regular.ttf", kind: "font", rights: "OFL_FONT_REUSED", previewOnly: false, productionReady: true, sourceRef: "#158" },
  { path: "/fonts/my-care/plex-arabic-semibold.ttf", kind: "font", rights: "OFL_FONT_REUSED", previewOnly: false, productionReady: true, sourceRef: "#158" },
  { path: "/fonts/my-care/manrope.ttf", kind: "font", rights: "OFL_FONT_REUSED", previewOnly: false, productionReady: true, sourceRef: "#158" },
] as const;

export const PRIVATE_EXCLUDED_ASSET_CLASSES = [
  {
    pattern: "art/*.webp | art/*.jpg",
    origin: "Private review archive (C2PA Media Services 1P derived)",
    publicStatus: "EXCLUDED_PUBLIC_AP05_PENDING",
    replacement: "Clean-room FoundationHeroVisual & FoundationPortalEmblem inline TSX SVG geometry",
  },
  {
    pattern: "illustrations/*.svg | icons.js",
    origin: "Private review archive (#176 EXTERNAL_PUBLICATION_AP05_REVIEW_PENDING)",
    publicStatus: "EXCLUDED_PUBLIC_AP05_PENDING",
    replacement: "Clean-room FoundationIcon & FoundationPortalEmblem inline TSX SVG components",
  },
] as const;

const PERMITTED_PATHS = new Set<string>(FOUNDATION_PUBLIC_ASSETS.map((entry) => entry.path));

export function isPermittedPublicAssetPath(src: string): boolean {
  return PERMITTED_PATHS.has(src);
}

export function verifyPublicAssetPath(src: string): string {
  if (!PERMITTED_PATHS.has(src)) {
    throw new Error(`Disallowed public asset reference outside cleared #158 manifest: ${src}`);
  }
  return src;
}
