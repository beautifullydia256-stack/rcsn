import type { ReactNode } from 'react';
import DesktopAuthGate from '../router/DesktopAuthGate';
import DesktopUpdateGate from '../update/DesktopUpdateGate';
import DesktopPinGate from './pin/DesktopPinGate';

/**
 * Electron-only shell: update gate → auth gate → PIN gate.
 * Loaded only when VITE_DESKTOP_MODE=true so the Vercel web bundle excludes it.
 */
export default function AppDesktopProviders({ children }: { children: ReactNode }) {
  return (
    <DesktopUpdateGate>
      <DesktopAuthGate>
        <DesktopPinGate>{children}</DesktopPinGate>
      </DesktopAuthGate>
    </DesktopUpdateGate>
  );
}
