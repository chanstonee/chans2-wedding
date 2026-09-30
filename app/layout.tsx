import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wedding Invitation · 다연 ♥ 재훈",
  description: "2027. 05. 15 PM 06:30, First Garden에서 열리는 결혼식에 초대합니다.",
  icons: {
    icon: [{ url: "/Favicon.png", type: "image/png" }],
    shortcut: "/Favicon.png",
    apple: "/Favicon.png",
  },
  openGraph: {
    title: "Wedding Invitaion",
    description: "2027. 05. 15 PM 06:30 · First Garden, Paju Korea",
    images: [{ url: "/og.png", width: 1728, height: 910, alt: "Wedding Invitaion" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wedding Invitaion",
    description: "2027. 05. 15 PM 06:30 · First Garden, Paju Korea",
    images: ["/og.png"],
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
