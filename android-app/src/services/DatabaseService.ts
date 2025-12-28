import SQLite from 'react-native-sqlite-storage';
import { v4 as uuidv4 } from 'uuid';

// Enable promise-based API
SQLite.DEBUG(true);
SQLite.enablePromise(true);

export interface DatabaseResult {
  rows: {
    length: number;
    item: (index: number) => any;
    _array: any[];
  };
  rowsAffected: number;
  insertId?: number;
}

class DatabaseService {
  private static db: SQLite.SQLiteDatabase | null = null;
  private static dbName = 'pwezacore.db';
  private static dbVersion = '1.0';

  static async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: this.dbName,
        location: 'default',
      });

      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  private static async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        role TEXT NOT NULL CHECK(role IN ('owner','admin','teacher','parent','student','accountant','librarian','head_teacher')),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        school_id TEXT,
        student_id TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        department TEXT,
        position TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Schools table
      `CREATE TABLE IF NOT EXISTS schools (
        school_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('Nursery/Primary','Secondary')),
        admin_id TEXT,
        subscription_plan TEXT DEFAULT 'Free (0-20)',
        student_count INTEGER DEFAULT 0,
        wifi_ssid TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Students table
      `CREATE TABLE IF NOT EXISTS students (
        student_id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        name TEXT NOT NULL,
        current_class TEXT NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','graduated')),
        graduation_year INTEGER,
        repeat_year INTEGER DEFAULT 0,
        expected_fee_amount REAL,
        admission_number TEXT UNIQUE,
        photo_base64 TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Teachers table
      `CREATE TABLE IF NOT EXISTS teachers (
        teacher_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        school_id TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        gender TEXT CHECK(gender IN ('Male','Female','Other')),
        dob TEXT,
        national_id TEXT,
        employee_id TEXT UNIQUE,
        date_of_hire TEXT,
        subjects TEXT,
        classes TEXT,
        experience TEXT,
        qualification TEXT,
        salary REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Exam Results table
      `CREATE TABLE IF NOT EXISTS exam_results (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        exam_set_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        class_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        marks_obtained REAL NOT NULL DEFAULT 0,
        total_marks REAL NOT NULL DEFAULT 100,
        grade TEXT,
        remarks TEXT,
        activity_score REAL,
        descriptor TEXT,
        formative_score REAL,
        exam_score REAL,
        final_score REAL,
        overall_remark TEXT,
        teacher_initials TEXT,
        topic TEXT,
        teacher_id TEXT,
        nursery_skill_performance TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Processed Exam Results table
      `CREATE TABLE IF NOT EXISTS processed_primary_exam_results (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        class_name TEXT NOT NULL,
        exam_set_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        mid_term_marks REAL,
        end_term_marks REAL,
        teacher_remark TEXT,
        teacher_initials TEXT,
        class_teacher_comment TEXT,
        headteacher_comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Exam Sets table
      `CREATE TABLE IF NOT EXISTS exam_sets (
        exam_set_id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        name TEXT NOT NULL,
        term TEXT NOT NULL,
        year INTEGER NOT NULL,
        exam_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Attendance table
      `CREATE TABLE IF NOT EXISTS attendance (
        attendance_id TEXT PRIMARY KEY,
        teacher_id TEXT,
        school_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('punch_in','punch_out')),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Payments table
      `CREATE TABLE IF NOT EXISTS payments (
        payment_id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        school_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Receipts table
      `CREATE TABLE IF NOT EXISTS receipts (
        receipt_id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        payment_id TEXT,
        amount REAL NOT NULL,
        payment_method TEXT,
        file_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Expenses table
      `CREATE TABLE IF NOT EXISTS expenses (
        expense_id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
        approved_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Teacher Remarks Settings table
      `CREATE TABLE IF NOT EXISTS teacher_remarks_settings (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        min_percent INTEGER NOT NULL,
        max_percent INTEGER NOT NULL,
        comment_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Class Teacher Comments Settings table
      `CREATE TABLE IF NOT EXISTS class_teacher_comments_settings (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        class_name TEXT NOT NULL,
        min_percent INTEGER NOT NULL,
        max_percent INTEGER NOT NULL,
        comment_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Sync Status table
      `CREATE TABLE IF NOT EXISTS sync_status (
        table_name TEXT PRIMARY KEY,
        last_sync DATETIME,
        pending_changes INTEGER DEFAULT 0,
        sync_in_progress INTEGER DEFAULT 0
      )`,

      // Pending Operations queue
      `CREATE TABLE IF NOT EXISTS pending_operations (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        operation_type TEXT NOT NULL CHECK(operation_type IN ('INSERT','UPDATE','DELETE')),
        record_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT
      )`,

      // Library table
      `CREATE TABLE IF NOT EXISTS library (
        content_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        file_url TEXT,
        file_path TEXT,
        uploaded_by TEXT DEFAULT 'owner',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Reports table
      `CREATE TABLE IF NOT EXISTS reports (
        report_id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        template_name TEXT,
        file_url TEXT,
        file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Parents table
      `CREATE TABLE IF NOT EXISTS parents (
        parent_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        student_id TEXT NOT NULL,
        school_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        is_synced INTEGER DEFAULT 0
      )`,

      // Create indexes for better performance
      `CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id)`,
      `CREATE INDEX IF NOT EXISTS idx_students_class ON students(current_class)`,
      `CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id)`,
      `CREATE INDEX IF NOT EXISTS idx_exam_results_exam_set ON exam_results(exam_set_id)`,
      `CREATE INDEX IF NOT EXISTS idx_pending_operations_table ON pending_operations(table_name)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_status(table_name)`,
    ];

    for (const sql of tables) {
      await this.db!.executeSql(sql);
    }
  }

  static async executeSql(
    sql: string,
    params: any[] = []
  ): Promise<DatabaseResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const [result] = await this.db.executeSql(sql, params);
      return result;
    } catch (error) {
      console.error('SQL execution error:', error, sql, params);
      throw error;
    }
  }

  static async query<T>(
    sql: string,
    params: any[] = []
  ): Promise<T[]> {
    const result = await this.executeSql(sql, params);
    const items: T[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(result.rows.item(i) as T);
    }
    return items;
  }

  static async insert(table: string, data: Record<string, any>): Promise<string> {
    const id = data.id || uuidv4();
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${table} (id, ${columns}) VALUES (?, ${placeholders})`;
    await this.executeSql(sql, [id, ...values]);

    // Add to pending operations queue
    await this.addToPendingQueue(table, 'INSERT', id, data);

    return id;
  }

  static async update(
    table: string,
    id: string,
    data: Record<string, any>
  ): Promise<void> {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(data);

    const sql = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await this.executeSql(sql, [...values, id]);

    // Add to pending operations queue
    await this.addToPendingQueue(table, 'UPDATE', id, data);
  }

  static async delete(table: string, id: string): Promise<void> {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    await this.executeSql(sql, [id]);

    // Add to pending operations queue
    await this.addToPendingQueue(table, 'DELETE', id, {});
  }

  static async findById<T>(table: string, id: string): Promise<T | null> {
    // Handle table-specific primary key columns
    let idColumn = 'id';
    if (table === 'users') {
      idColumn = 'user_id';
    } else if (table === 'schools') {
      idColumn = 'school_id';
    } else if (table === 'students') {
      idColumn = 'student_id';
    } else if (table === 'teachers') {
      idColumn = 'teacher_id';
    } else if (table === 'parents') {
      idColumn = 'parent_id';
    } else if (table === 'exam_sets') {
      idColumn = 'exam_set_id';
    } else if (table === 'exam_results') {
      idColumn = 'id';
    } else if (table === 'attendance') {
      idColumn = 'attendance_id';
    } else if (table === 'payments') {
      idColumn = 'payment_id';
    } else if (table === 'receipts') {
      idColumn = 'receipt_id';
    } else if (table === 'expenses') {
      idColumn = 'expense_id';
    }
    
    const results = await this.query<T>(`SELECT * FROM ${table} WHERE ${idColumn} = ?`, [id]);
    return results.length > 0 ? results[0] : null;
  }

  static async findAll<T>(table: string, where?: string, params?: any[]): Promise<T[]> {
    const sql = where
      ? `SELECT * FROM ${table} WHERE ${where}`
      : `SELECT * FROM ${table}`;
    return this.query<T>(sql, params || []);
  }

  private static async addToPendingQueue(
    table: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: string,
    data: Record<string, any>
  ): Promise<void> {
    const queueId = uuidv4();
    const sql = `
      INSERT INTO pending_operations (id, table_name, operation_type, record_id, data)
      VALUES (?, ?, ?, ?, ?)
    `;
    await this.executeSql(sql, [
      queueId,
      table,
      operation,
      recordId,
      JSON.stringify(data),
    ]);
  }

  static async getPendingOperations(): Promise<any[]> {
    return this.query('SELECT * FROM pending_operations ORDER BY created_at ASC');
  }

  static async clearPendingOperation(id: string): Promise<void> {
    await this.executeSql('DELETE FROM pending_operations WHERE id = ?', [id]);
  }

  static async markAsSynced(table: string, id: string): Promise<void> {
    await this.executeSql(
      `UPDATE ${table} SET is_synced = 1, synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  }

  static async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export default DatabaseService;


