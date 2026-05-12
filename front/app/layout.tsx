import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { OptionalClerkProvider } from "@/lib/clerk-compat";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taclaro",
  description: "Banking analytics and benchmark interface for Taclaro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <OptionalClerkProvider>
          {children}
          <Analytics />
        </OptionalClerkProvider>
      </body>
    </html>
  );
}
