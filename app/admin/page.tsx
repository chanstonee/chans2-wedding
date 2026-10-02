import type { Metadata } from "next";
import GuestbookAdmin from "./GuestbookAdmin";

export const metadata: Metadata = {
  title: "방명록 관리",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AdminPage() {
  return <GuestbookAdmin />;
}
