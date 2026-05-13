/**
 * Visual Template Designer - Keyboard Shortcuts Panel
 *
 * Modal/panel that displays all available keyboard shortcuts in a table
 * with Windows/Linux and Mac columns.
 *
 * Requirements:
 * - 18.x: Display all keyboard shortcuts
 */

import React, { useEffect } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Shortcuts data
// ---------------------------------------------------------------------------

interface ShortcutRow {
  action: string;
  windows: string;
  mac: string;
}

const SHORTCUTS: ShortcutRow[] = [
  { action: 'Undo',                   windows: 'Ctrl + Z',         mac: 'Cmd + Z' },
  { action: 'Redo',                   windows: 'Ctrl + Y',         mac: 'Cmd + Y' },
  { action: 'Copy component',         windows: 'Ctrl + C',         mac: 'Cmd + C' },
  { action: 'Paste component',        windows: 'Ctrl + V',         mac: 'Cmd + V' },
  { action: 'Delete selected',        windows: 'Delete / Backspace', mac: 'Delete / Backspace' },
  { action: 'Save template',          windows: 'Ctrl + S',         mac: 'Cmd + S' },
  { action: 'Duplicate component',    windows: 'Ctrl + D',         mac: 'Cmd + D' },
  { action: 'Move component (1px)',   windows: 'Arrow keys',       mac: 'Arrow keys' },
  { action: 'Move component (10px)',  windows: 'Shift + Arrow keys', mac: 'Shift + Arrow keys' },
];

// ---------------------------------------------------------------------------
// KeyboardShortcutsPanel component
// ---------------------------------------------------------------------------

export function KeyboardShortcutsPanel({ isOpen, onClose }: KeyboardShortcutsPanelProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-panel-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={(e) => {
        // Close when clicking the backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          padding: '28px 32px',
          minWidth: 480,
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 id="shortcuts-panel-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            aria-label="Close shortcuts panel"
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#6b7280',
              lineHeight: 1,
              padding: '4px 8px',
            }}
          >
            &times;
          </button>
        </div>

        {/* Table */}
        <table
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}
          aria-label="Keyboard shortcuts table"
        >
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={thStyle}>Action</th>
              <th style={thStyle}>Windows / Linux</th>
              <th style={thStyle}>Mac</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((row, index) => (
              <tr
                key={row.action}
                style={{ background: index % 2 === 0 ? '#f9fafb' : '#fff' }}
              >
                <td style={tdStyle}>{row.action}</td>
                <td style={tdCodeStyle}>
                  <kbd style={kbdStyle}>{row.windows}</kbd>
                </td>
                <td style={tdCodeStyle}>
                  <kbd style={kbdStyle}>{row.mac}</kbd>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  fontSize: 13,
};

const tdStyle: React.CSSProperties = {
  padding: '9px 12px',
  color: '#374151',
  borderBottom: '1px solid #f3f4f6',
};

const tdCodeStyle: React.CSSProperties = {
  ...tdStyle,
};

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  background: '#f3f4f6',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  fontSize: 12,
  fontFamily: 'monospace',
  color: '#111827',
};

export default KeyboardShortcutsPanel;
