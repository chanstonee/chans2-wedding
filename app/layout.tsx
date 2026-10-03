import type { Metadata } from "next";
import "./globals.css";
import "./themes.css";

const publicBasePath = process.env.PAGES_BUILD === "1"
  ? (process.env.PAGES_BASE_PATH ?? "/wedding").replace(/\/$/, "")
  : "";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PAGES_BUILD === "1" ? "https://chanstonee.github.io" : "https://chans2.chanstones2.chatgpt.site"),
  title: "wedding invitaion",
  description: "2027. 05. 15 PM 06:30, First Garden에서 열리는 결혼식에 초대합니다.",
  icons: {
    icon: [{ url: `${publicBasePath}/Favicon.png`, type: "image/png" }],
    shortcut: `${publicBasePath}/Favicon.png`,
    apple: `${publicBasePath}/Favicon.png`,
  },
  openGraph: {
    title: "wedding invitaion",
    description: "2027. 05. 15 PM 06:30 · First Garden, Paju Korea",
    images: [{ url: `${publicBasePath}/og.png`, width: 1728, height: 910, alt: "wedding invitaion" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "wedding invitaion",
    description: "2027. 05. 15 PM 06:30 · First Garden, Paju Korea",
    images: [`${publicBasePath}/og.png`],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#fae4df" />
      </head>
      <body>{children}</body>
    </html>
  );
}
