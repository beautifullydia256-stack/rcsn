import type { ReactNode } from 'react';
import DesktopAuthGate from '../router/DesktopAuthGate';
import DesktopUpdateGate from '../update/DesktopUpdateGate';

/**
 * Electron-only shell: auto-update gate + auth gate. Loaded only when VITE_DESKTOP_MODE=true
 * so the Vercel web bundle does not include this module.
 */
export default function AppDesktopProviders({ children }: { children: ReactNode }) {
  return (
    <DesktopUpdateGate>
      <DesktopAuthGate>{children}</DesktopAuthGate>
    </DesktopUpdateGate>
  );
}
