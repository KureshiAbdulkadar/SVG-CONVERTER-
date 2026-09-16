import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VectorForge — Precision Semantic AI Vectorizer',
  description:
    'Transform pixel images (PNG, JPG, WebP) into production-ready, semantic, layered SVG/PDF/EPS vectors in under 1 second.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased selection:bg-indigo-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
