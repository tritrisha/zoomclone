import type { Metadata } from "next";
//import "./globals.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "Zooma — Video meetings",
  description: "A modern video conferencing platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}

