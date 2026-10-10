import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "JARVIS · Command Center",
  description: "Your personal AI command center",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
