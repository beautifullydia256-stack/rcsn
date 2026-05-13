/**
 * Visual Template Designer - Audit Service
 *
 * Records in-memory audit log entries for template administrator actions.
 * In a production deployment each entry would be persisted to Supabase.
 */

export interface AuditLogEntry {
  id: string;
  action: 'CREATE' | 'MODIFY' | 'DELETE' | 'EXPORT' | 'IMPORT' | 'RESTORE_VERSION';
  templateId: string;
  templateName: string;
  administratorId: string;
  administratorEmail?: string;
  timestamp: Date;
  details?: string;
}

export class AuditService {
  private log_: AuditLogEntry[] = [];

  /**
   * Record an audit log entry.
   * Automatically assigns a unique id and timestamp.
   */
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
    };
    this.log_.push(fullEntry);
  }

  /**
   * Return a copy of the full audit log.
   */
  getLog(): AuditLogEntry[] {
    return [...this.log_];
  }

  /**
   * Clear all audit log entries.
   */
  clearLog(): void {
    this.log_ = [];
  }
}
