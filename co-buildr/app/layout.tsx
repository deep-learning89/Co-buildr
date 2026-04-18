import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CoBuildr - Find Your People with AI',
  description:
    'AI finds your exact co-founder, collaborator, or builder match across every platform. One prompt. No noise. Just the right people.',
  openGraph: {
    title: 'CoBuildr - Find Your People with AI',
    description: 'AI-powered people matching across Reddit, Discord, LinkedIn, X, and more.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    site: '@CoBuildr',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
