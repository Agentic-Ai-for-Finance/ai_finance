import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taclaro",
  description: "Credit-card analytics demo for Taclaro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
