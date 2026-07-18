import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import CommandPaletteProvider from '@/components/CommandPaletteProvider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Plataforma SaaS Multirubro | Sistema de Gestión Integral',
  description:
    'Sistema de gestión multi-tenant, marketplace de módulos y facturación ARCA para comercios y servicios en Argentina y Latinoamérica.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CommandPaletteProvider>{children}</CommandPaletteProvider>
      </body>
    </html>
  );
}
