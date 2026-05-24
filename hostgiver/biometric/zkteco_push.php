<?php
/**
 * ZKTeco ADMS (Cloud Server) Push Endpoint
 *
 * Configure on ZKTeco F18 device:
 *   Menu → Cloud Server (or ADMS) → Server Address
 *   URL: https://yourdomain.com/biometric/zkteco_push.php?d=DEVICE_UUID&t=TOKEN
 *
 * The device will POST attendance events as form data.
 * It also GETs this URL for command polling — we return an empty OK.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/SupabaseClient.php';
require_once __DIR__ . '/lib/AttendanceSync.php';
require_once __DIR__ . '/adapters/ZKTecoAdapter.php';

$deviceId = trim($_GET['d'] ?? '');
$token    = trim($_GET['t'] ?? '');

// ZKTeco GETs this URL for heartbeat / command polling
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    ZKTecoAdapter::ackAdms();
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

if (!$deviceId || !$token) {
    http_response_code(400);
    echo "FAIL";
    exit;
}

// Verify device
$db     = new SupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
$device = $db->single('biometric_devices',
    'id,school_id,webhook_token,is_active',
    ['id' => 'eq.' . $deviceId]
);

if (!$device || $device['webhook_token'] !== $token || !$device['is_active']) {
    // Still return OK to prevent ZKTeco from filling device memory with unsent logs
    ZKTecoAdapter::ackAdms();
    exit;
}

// Parse the ADMS POST body
$event = ZKTecoAdapter::parseAdmsPush();

if ($event && $event['device_user_id']) {
    $sync   = new AttendanceSync();
    $result = $sync->process($device['school_id'], $event['device_user_id'], $event['scan_time'], $deviceId);
    $db->patch('biometric_devices', ['id' => 'eq.' . $deviceId], [
        'last_sync_at' => date('c'),
        'sync_status'  => $result['ok'] ? 'ok' : 'error',
        'sync_message' => $result['message'],
    ]);
}

// ZKTeco expects plain "OK"
ZKTecoAdapter::ackAdms();
