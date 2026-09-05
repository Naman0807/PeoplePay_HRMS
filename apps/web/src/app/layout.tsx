import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PeoplePay360',
  description: 'Integrated HR & Payroll Operations Platform',
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
