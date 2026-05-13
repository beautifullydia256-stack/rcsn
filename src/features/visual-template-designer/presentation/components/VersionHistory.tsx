/**
 * Visual Template Designer - Version History Panel
 *
 * Displays a list of template version snapshots with restore and preview actions.
 *
 * Requirements:
 * - 15.1: View version history
 * - 15.2: Restore a previous version
 * - 15.3: Preview a version
 */

import React from 'react';
import type { TemplateVersion } from '../../application/services/TemplateService';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VersionHistoryProps {
  versions: TemplateVersion[];
  onRestore: (version: TemplateVersion) => void;
  onPreview: (version: TemplateVersion) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// VersionHistory component
// ---------------------------------------------------------------------------

export function VersionHistory({ versions, onRestore, onPreview }: VersionHistoryProps) {
  if (versions.length === 0) {
    return (
      <div style={{ padding: 24, color: '#6b7280', textAlign: 'center' }}>
        No version history available.
      </div>
    );
  }

  // Display newest first
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#111827' }}>
        Version History
      </h2>
      <ul
        style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}
        aria-label="Version history list"
      >
        {sorted.map((version) => (
          <li
            key={version.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '12px 16px',
              background: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {/* Version metadata */}
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                Version {version.versionNumber}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {formatDate(version.timestamp)}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                By: {version.administratorId}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => onPreview(version)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 4,
                  cursor: 'pointer',
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                }}
                aria-label={`Preview version ${version.versionNumber}`}
              >
                Preview
              </button>
              <button
                onClick={() => onRestore(version)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 4,
                  cursor: 'pointer',
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                }}
                aria-label={`Restore version ${version.versionNumber}`}
              >
                Restore
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default VersionHistory;
