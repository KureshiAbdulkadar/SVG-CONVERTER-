import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VectorForge — Image to SVG",
  description:
    "Convert PNG, JPG and WebP images to editable SVG files locally in your browser. Compare, inspect layers and download.",
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
