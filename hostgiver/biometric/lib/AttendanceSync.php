<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/SupabaseClient.php';

/**
 * Core attendance processing shared by ALL device adapters.
 *
 * Given: school_id + device_user_id + scan_time
 * Does:  looks up the person, writes student_attendance or teacher_attendance_logs
 */
class AttendanceSync {
    private SupabaseClient $db;

    public function __construct() {
        $this->db = new SupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }

    /**
     * Process a single scan event.
     *
     * @param string $schoolId   UUID of the school
     * @param string $deviceUserId  ID as stored on the physical device (e.g. "104")
     * @param string $scanTimeIso   ISO 8601 datetime with timezone
     * @param string|null $deviceId UUID of the biometric_devices row (optional)
     * @return array { ok: bool, message: string }
     */
    public function process(string $schoolId, string $deviceUserId, string $scanTimeIso, ?string $deviceId = null): array {
        // ── Load school settings ────────────────────────────────────────────
        $school = $this->db->single('schools',
            'biometric_teacher_punch,biometric_student_attendance,biometric_late_cutoff_teacher,biometric_late_cutoff_student',
            ['school_id' => 'eq.' . $schoolId]
        );
        if (!$school) return ['ok' => false, 'message' => 'School not found'];

        // ── Resolve device user → internal person ───────────────────────────
        $filters = ['school_id' => 'eq.' . $schoolId, 'device_user_id' => 'eq.' . $deviceUserId, 'active' => 'eq.true'];
        if ($deviceId) $filters['device_id'] = 'eq.' . $deviceId;

        $mapping = $this->db->single('biometric_device_users', 'person_type,person_id', $filters);
        if (!$mapping) {
            // Fallback: try without device filter (for schools with one device)
            if ($deviceId) {
                $mapping = $this->db->single('biometric_device_users',
                    'person_type,person_id',
                    ['school_id' => 'eq.' . $schoolId, 'device_user_id' => 'eq.' . $deviceUserId, 'active' => 'eq.true']
                );
            }
            if (!$mapping) return ['ok' => true, 'message' => "Device user {$deviceUserId} not enrolled — ignored"];
        }

        // ── Parse scan time ─────────────────────────────────────────────────
        date_default_timezone_set(TIMEZONE);
        try {
            $dt = new DateTime($scanTimeIso, new DateTimeZone(TIMEZONE));
            $dt->setTimezone(new DateTimeZone(TIMEZONE));
        } catch (Exception $e) {
            $dt = new DateTime('now', new DateTimeZone(TIMEZONE));
        }
        $today      = $dt->format('Y-m-d');
        $scanIso    = $dt->format('c');
        $hour       = (int)$dt->format('H');
        $minute     = (int)$dt->format('i');

        $personType = $mapping['person_type'];
        $personId   = $mapping['person_id'];

        if ($personType === 'student') {
            return $this->recordStudent($school, $schoolId, $personId, $today, $scanIso, $hour, $minute, $dt);
        }
        if ($personType === 'teacher') {
            return $this->recordTeacher($school, $schoolId, $personId, $today, $scanIso, $hour, $minute);
        }
        return ['ok' => true, 'message' => "Person type '{$personType}' not yet handled"];
    }

    private function recordStudent(array $school, string $schoolId, string $studentId, string $today, string $scanIso, int $hour, int $minute, DateTime $dt): array {
        if (!$school['biometric_student_attendance']) {
            return ['ok' => true, 'message' => 'Student biometric attendance disabled'];
        }
        [$lh, $lm] = $this->parseCutoff($school['biometric_late_cutoff_student']);
        $isLate = ($hour > $lh) || ($hour === $lh && $minute > $lm);
        $status = $isLate ? 'late' : 'present';

        // Idempotent: don't double-record the same day
        $existing = $this->db->single('student_attendance', 'attendance_id',
            ['student_id' => 'eq.' . $studentId, 'attendance_date' => 'eq.' . $today, 'school_id' => 'eq.' . $schoolId]
        );
        if ($existing) return ['ok' => true, 'message' => 'Student already marked today'];

        $student = $this->db->single('students', 'current_class', ['student_id' => 'eq.' . $studentId]);
        $code = $this->db->insert('student_attendance', [
            'school_id'       => $schoolId,
            'student_id'      => $studentId,
            'class_name'      => $student['current_class'] ?? '',
            'attendance_date' => $today,
            'date'            => $today,
            'status'          => $status,
            'present'         => true,
            'arrived_late'    => $isLate,
            'remarks'         => 'Biometric scan at ' . $dt->format('H:i'),
            'biometric_scan'  => true,
            'created_at'      => $scanIso,
        ]);
        return $code < 300
            ? ['ok' => true, 'message' => "Student marked {$status}"]
            : ['ok' => false, 'message' => "DB insert failed (HTTP {$code})"];
    }

    private function recordTeacher(array $school, string $schoolId, string $teacherId, string $today, string $scanIso, int $hour, int $minute): array {
        if (!$school['biometric_teacher_punch']) {
            return ['ok' => true, 'message' => 'Teacher biometric punch disabled'];
        }
        [$lh, $lm] = $this->parseCutoff($school['biometric_late_cutoff_teacher']);
        $isLate = ($hour > $lh) || ($hour === $lh && $minute > $lm);

        $log = $this->db->single('teacher_attendance_logs', 'log_id,check_in_time,check_out_time',
            ['teacher_id' => 'eq.' . $teacherId, 'attendance_date' => 'eq.' . $today, 'school_id' => 'eq.' . $schoolId]
        );

        if (!$log || !$log['check_in_time']) {
            // Punch IN
            $status = $isLate ? 'late' : 'present';
            if ($log) {
                $this->db->patch('teacher_attendance_logs', ['log_id' => 'eq.' . $log['log_id']],
                    ['check_in_time' => $scanIso, 'status' => $status, 'biometric_scan' => true]);
            } else {
                $this->db->insert('teacher_attendance_logs', [
                    'school_id' => $schoolId, 'teacher_id' => $teacherId,
                    'attendance_date' => $today, 'check_in_time' => $scanIso,
                    'status' => $status, 'remarks' => 'Biometric scan', 'biometric_scan' => true,
                ]);
            }
            return ['ok' => true, 'message' => "Teacher punched in — {$status}"];
        }
        if (!$log['check_out_time']) {
            // Punch OUT
            $this->db->patch('teacher_attendance_logs', ['log_id' => 'eq.' . $log['log_id']],
                ['check_out_time' => $scanIso, 'biometric_scan' => true]);
            return ['ok' => true, 'message' => 'Teacher punched out'];
        }
        return ['ok' => true, 'message' => 'Teacher already completed punch cycle today'];
    }

    private function parseCutoff(string $cutoff): array {
        $parts = explode(':', $cutoff . ':00');
        return [(int)$parts[0], (int)$parts[1]];
    }
}
