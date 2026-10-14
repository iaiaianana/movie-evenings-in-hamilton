import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hamilton Cinema Club",
  description: "Movie Nights — our weekly cinema club, screening diary, reviews and suggestions.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
