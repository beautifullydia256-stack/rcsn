<?php
/**
 * Hikvision Event Push Endpoint
 *
 * Configure on device: Network → Event Push → HTTP
 * URL: https://yourdomain.com/biometric/hikvision_push.php?d=DEVICE_UUID&t=TOKEN
 *
 * DEVICE_UUID and TOKEN are shown in Pwezacore → Admin → Biometric Devices.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/SupabaseClient.php';
require_once __DIR__ . '/lib/AttendanceSync.php';
require_once __DIR__ . '/adapters/HikvisionAdapter.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST only']);
    exit;
}

$deviceId = trim($_GET['d'] ?? '');
$token    = trim($_GET['t'] ?? '');

if (!$deviceId || !$token) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing d or t params']);
    exit;
}

// Verify device and token
$db     = new SupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
$device = $db->single('biometric_devices',
    'id,school_id,webhook_token,is_active,device_name',
    ['id' => 'eq.' . $deviceId]
);

if (!$device) {
    http_response_code(404);
    echo json_encode(['error' => 'Device not found']);
    exit;
}
if ($device['webhook_token'] !== $token) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}
if (!$device['is_active']) {
    http_response_code(200);
    echo json_encode(['message' => 'Device is disabled']);
    exit;
}

// Parse Hikvision event
$event = HikvisionAdapter::parseEvent();
if (!$event || !$event['device_user_id']) {
    http_response_code(200); // Return 200 so device doesn't retry indefinitely
    echo json_encode(['message' => 'No actionable event in payload']);
    exit;
}

$scanTime = $event['scan_time'] ?: date('c');

// Process attendance
$sync   = new AttendanceSync();
$result = $sync->process($device['school_id'], $event['device_user_id'], $scanTime, $deviceId);

// Update device last_sync_at
$db->patch('biometric_devices', ['id' => 'eq.' . $deviceId], [
    'last_sync_at' => date('c'),
    'sync_status'  => $result['ok'] ? 'ok' : 'error',
    'sync_message' => $result['message'],
]);

http_response_code(200);
echo json_encode($result);
