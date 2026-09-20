import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/context';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'SUBSIGHT — Intelligent Subscription & Recurring Payment Detection',
  description:
    'Ingest raw transaction data, detect recurring payments with deterministic confidence scoring, surface forgotten subscriptions, and generate deep financial insights.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
