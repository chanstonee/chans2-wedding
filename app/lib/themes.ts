export type InvitationTheme = "blush" | "blue-mint";

export const defaultTheme: InvitationTheme = "blush";
export const themeStorageKey = "wedding-theme";
export const themeLabels: Record<InvitationTheme, string> = {
  blush: "블러시",
  "blue-mint": "블루 민트",
};

export function themeAsset(source: string | undefined, theme: InvitationTheme) {
  if (!source || theme === "blush") return source;
  const filename = source.slice(source.lastIndexOf("/") + 1);
  // Share the original PNG geometry and alpha; the blue palette is applied in CSS.
  return filename === "splash-loader.svg" ? "/assets/themes/blue-mint/" + filename : source;
}
