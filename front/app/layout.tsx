import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { OptionalClerkProvider } from "@/lib/clerk-compat";
import { SearchContextProvider } from "@/lib/search-context";
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
          <SearchContextProvider>
            {children}
          </SearchContextProvider>
          <Analytics />
        </OptionalClerkProvider>
      </body>
    </html>
  );
}
