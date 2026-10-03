export type InvitationTheme = "blush" | "blue-mint";

export const defaultTheme: InvitationTheme = "blue-mint";
export const themeStorageKey = "wedding-theme";
export const themeLabels: Record<InvitationTheme, string> = {
  blush: "블러시",
  "blue-mint": "블루 민트",
};

const themedIllustrations = new Set([
  "doodle-couple-main.png", "doodle-message.png", "doodle-location.png",
  "doodle-calendar.png", "doodle-dinner.png", "doodle-picture.png",
  "doodle-thanks.png", "doodle-alert.png", "doodle-check.png",
  "doodle-call.png", "title-frame.png", "splash-loader.svg",
]);

export function themeAsset(source: string | undefined, theme: InvitationTheme) {
  if (!source || theme === "blush") return source;
  const filename = source.slice(source.lastIndexOf("/") + 1);
  return themedIllustrations.has(filename) ? "/assets/themes/blue-mint/" + filename : source;
}
