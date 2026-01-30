import { ReactNode } from 'react';
import AppShell from './AppShell';

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return <AppShell>{children}</AppShell>;
}

