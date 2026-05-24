<?php
/**
 * Pwezacore Biometric Attendance Receiver
 * Receives HTTP event push from Hikvision DS-K1A802F (and compatible devices).
 *
 * Device configuration URL:
 *   http://yourdomain.com/hikvision/punch.php?s=SCHOOL_UUID&t=WEBHOOK_TOKEN
 *
 * The school_id (s) and webhook token (t) are shown in
 * Pwezacore → Settings → Biometric.
 */

require_once __DIR__ . '/config.php';

// ── Helpers ──────────────────────────────────────────────────────────────────

function supabase_get(string $path, array $params = []): ?array {
    $url = SUPABASE_URL . '/rest/v1/' . $path;
    if ($params) $url .= '?' . http_build_query($params);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'apikey: ' . SUPABASE_SERVICE_KEY,
            'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
        ],
    ]);
    $body = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

function supabase_post(string $path, array $payload, string $prefer = 'return=minimal'): array {
    $url = SUPABASE_URL . '/rest/v1/' . $path;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'apikey: ' . SUPABASE_SERVICE_KEY,
            'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
            'Content-Type: application/json',
            'Prefer: ' . $prefer,
        ],
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => json_decode($body, true)];
}

function supabase_patch(string $path, array $filters, array $payload): int {
    $url = SUPABASE_URL . '/rest/v1/' . $path . '?' . http_build_query($filters);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'PATCH',
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'apikey: ' . SUPABASE_SERVICE_KEY,
            'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
            'Content-Type: application/json',
            'Prefer: return=minimal',
        ],
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $code;
}

function respond(int $status, string $message): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode(['status' => $status, 'message' => $message]);
    exit;
}

// ── 1. Only accept POST ───────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, 'Method not allowed');
}

// ── 2. Read and validate query params ────────────────────────────────────────
$schoolId = trim($_GET['s'] ?? '');
$token    = trim($_GET['t'] ?? '');

if (!$schoolId || !$token) {
    respond(400, 'Missing s (school_id) or t (token) query parameters');
}

// ── 3. Verify token against database ─────────────────────────────────────────
$schools = supabase_get('schools', [
    'select'   => 'school_id,biometric_webhook_token,biometric_teacher_punch,biometric_student_attendance,biometric_late_cutoff_teacher,biometric_late_cutoff_student',
    'school_id' => 'eq.' . $schoolId,
    'limit'    => '1',
]);

if (empty($schools)) {
    respond(404, 'School not found');
}

$school = $schools[0];

if ($school['biometric_webhook_token'] !== $token) {
    respond(403, 'Invalid token');
}

// ── 4. Parse Hikvision event body (XML, multipart/XML, or JSON) ───────────────
$rawBody     = '';
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';

// Hikvision sometimes sends multipart/form-data with XML in an uploaded file
if (!empty($_FILES)) {
    foreach ($_FILES as $f) {
        if (!empty($f['tmp_name']) && file_exists($f['tmp_name'])) {
            $rawBody = file_get_contents($f['tmp_name']);
            break;
        }
    }
}
if (!$rawBody) {
    $rawBody = file_get_contents('php://input');
}

$deviceUserId    = null;
$eventTimeStr    = null;
$attendanceStatus = null; // 'checkIn' | 'checkOut' | '' (we determine in/out ourselves)

if (strpos(ltrim($rawBody), '{') === 0) {
    // JSON format
    $data = json_decode($rawBody, true) ?? [];
    $deviceUserId     = (string)($data['employeeNoString'] ?? $data['employeeNo'] ?? $data['AcsEvent']['employeeNoString'] ?? '');
    $eventTimeStr     = (string)($data['time'] ?? $data['dateTime'] ?? $data['AcsEvent']['time'] ?? '');
    $attendanceStatus = (string)($data['attendanceStatus'] ?? $data['AcsEvent']['attendanceStatus'] ?? '');
} else {
    // XML format (most common for DS-K1A802F)
    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($rawBody);
    if ($xml) {
        $acs = $xml->AcsEvent ?? null;
        $deviceUserId     = (string)($acs->employeeNoString ?? $xml->employeeNoString ?? '');
        $eventTimeStr     = (string)($acs->time ?? $xml->dateTime ?? $xml->time ?? '');
        $attendanceStatus = (string)($acs->attendanceStatus ?? '');
    }
}

$deviceUserId = trim($deviceUserId);

if (!$deviceUserId) {
    respond(400, 'Could not extract employeeNoString from event payload');
}

// ── 5. Parse event time (default to now in EAT if missing) ──────────────────
date_default_timezone_set(TIMEZONE);
try {
    $dt = $eventTimeStr ? new DateTime($eventTimeStr, new DateTimeZone(TIMEZONE)) : new DateTime('now');
    $dt->setTimezone(new DateTimeZone(TIMEZONE));
} catch (Exception $e) {
    $dt = new DateTime('now', new DateTimeZone(TIMEZONE));
}
$today       = $dt->format('Y-m-d');
$scanTimeIso = $dt->format('c');         // ISO 8601 with timezone
$scanHour    = (int)$dt->format('H');
$scanMinute  = (int)$dt->format('i');

// ── 6. Look up device user → internal person ─────────────────────────────────
$deviceUsers = supabase_get('biometric_device_users', [
    'select'         => 'person_type,person_id,device_name',
    'school_id'      => 'eq.' . $schoolId,
    'device_user_id' => 'eq.' . $deviceUserId,
    'active'         => 'eq.true',
    'limit'          => '1',
]);

if (empty($deviceUsers)) {
    // Unknown device user — log and ignore (not enrolled in Pwezacore)
    respond(200, 'Device user ' . $deviceUserId . ' not enrolled; ignored');
}

$person     = $deviceUsers[0];
$personType = $person['person_type'];
$personId   = $person['person_id'];

// ── 7a. Student attendance ───────────────────────────────────────────────────
if ($personType === 'student') {
    if (!$school['biometric_student_attendance']) {
        respond(200, 'Student biometric attendance disabled for this school');
    }

    // Parse late cutoff, e.g. "08:00:00"
    [$lateH, $lateM] = array_map('intval', explode(':', $school['biometric_late_cutoff_student'] . ':00'));
    $isLate  = ($scanHour > $lateH) || ($scanHour === $lateH && $scanMinute > $lateM);
    $status  = $isLate ? 'late' : 'present';

    // Check if already marked today
    $existing = supabase_get('student_attendance', [
        'select'          => 'attendance_id',
        'student_id'      => 'eq.' . $personId,
        'attendance_date' => 'eq.' . $today,
        'school_id'       => 'eq.' . $schoolId,
        'limit'           => '1',
    ]);

    if (!empty($existing)) {
        respond(200, 'Student already marked for today');
    }

    // Fetch student class
    $students = supabase_get('students', [
        'select'     => 'current_class',
        'student_id' => 'eq.' . $personId,
        'limit'      => '1',
    ]);
    $className = $students[0]['current_class'] ?? '';

    $result = supabase_post('student_attendance', [
        'school_id'       => $schoolId,
        'student_id'      => $personId,
        'class_name'      => $className,
        'attendance_date' => $today,
        'date'            => $today,
        'status'          => $status,
        'present'         => true,
        'arrived_late'    => $isLate,
        'remarks'         => 'Biometric scan at ' . $dt->format('H:i'),
        'biometric_scan'  => true,
        'created_at'      => $scanTimeIso,
    ]);

    if ($result['code'] >= 400) {
        respond(500, 'Failed to record student attendance: ' . json_encode($result['body']));
    }

    respond(200, 'Student attendance recorded — ' . $status);
}

// ── 7b. Teacher attendance (punch in / punch out) ────────────────────────────
if ($personType === 'teacher') {
    if (!$school['biometric_teacher_punch']) {
        respond(200, 'Teacher biometric punch disabled for this school');
    }

    [$lateH, $lateM] = array_map('intval', explode(':', $school['biometric_late_cutoff_teacher'] . ':00'));
    $isLate = ($scanHour > $lateH) || ($scanHour === $lateH && $scanMinute > $lateM);

    // Check today's log
    $logs = supabase_get('teacher_attendance_logs', [
        'select'          => 'log_id,check_in_time,check_out_time',
        'teacher_id'      => 'eq.' . $personId,
        'attendance_date' => 'eq.' . $today,
        'school_id'       => 'eq.' . $schoolId,
        'limit'           => '1',
    ]);

    $existing = $logs[0] ?? null;

    // Determine in/out from device if provided, else from DB state
    if ($attendanceStatus === 'checkOut' || ($existing && $existing['check_in_time'] && !$existing['check_out_time'])) {
        // Punch OUT
        if (!$existing) {
            respond(409, 'No check-in found for today; cannot check out');
        }
        if ($existing['check_out_time']) {
            respond(200, 'Already punched out today');
        }
        supabase_patch('teacher_attendance_logs',
            ['log_id' => 'eq.' . $existing['log_id']],
            ['check_out_time' => $scanTimeIso, 'biometric_scan' => true]
        );
        respond(200, 'Teacher punched out at ' . $dt->format('H:i'));
    } else {
        // Punch IN
        if ($existing && $existing['check_in_time']) {
            respond(200, 'Already punched in today');
        }
        $status = $isLate ? 'late' : 'present';
        if ($existing) {
            supabase_patch('teacher_attendance_logs',
                ['log_id' => 'eq.' . $existing['log_id']],
                ['check_in_time' => $scanTimeIso, 'status' => $status, 'biometric_scan' => true]
            );
        } else {
            supabase_post('teacher_attendance_logs', [
                'school_id'       => $schoolId,
                'teacher_id'      => $personId,
                'attendance_date' => $today,
                'check_in_time'   => $scanTimeIso,
                'status'          => $status,
                'remarks'         => 'Biometric scan',
                'biometric_scan'  => true,
            ]);
        }
        respond(200, 'Teacher punched in — ' . $status . ' at ' . $dt->format('H:i'));
    }
}

// other_staff — future
respond(200, 'Scan received; person type not yet handled');
