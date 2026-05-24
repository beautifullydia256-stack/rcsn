<?php
/**
 * ZKTeco TCP Polling Script (Cron-based)
 *
 * Run this every 5 minutes via cPanel Cron Jobs:
 *   * /5 * * * *  php /home/USERNAME/public_html/biometric/zkteco_poll.php
 *
 * Connects to every active ZKTeco device in the database,
 * pulls attendance logs via TCP (port 4370), and writes them to Supabase.
 *
 * The device must be reachable from your Hostgiver server:
 *   - Either configure port forwarding on the school router (4370 → device IP)
 *   - Or if Hostgiver and the device are on the same network (unlikely for cloud hosting)
 *   - Recommended: set device IP to static/public and open port 4370 in school router
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/SupabaseClient.php';
require_once __DIR__ . '/lib/AttendanceSync.php';
require_once __DIR__ . '/lib/ZKTecoClient.php';

// Prevent browser execution — cron only
if (php_sapi_name() !== 'cli' && empty($_GET['cron_token'])) {
    http_response_code(403);
    echo "Run via CLI cron only";
    exit;
}

$db = new SupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Load all active ZKTeco devices
$devices = $db->select('biometric_devices',
    'id,school_id,device_name,ip_address,port',
    ['device_type' => 'eq.zkteco', 'is_active' => 'eq.true'],
    200
);

if (empty($devices)) {
    echo "No active ZKTeco devices found.\n";
    exit;
}

$sync = new AttendanceSync();

foreach ($devices as $device) {
    $ip       = $device['ip_address'];
    $port     = (int)($device['port'] ?? 4370);
    $deviceId = $device['id'];
    $schoolId = $device['school_id'];
    $name     = $device['device_name'];

    if (!$ip) {
        echo "[$name] No IP configured — skipping.\n";
        continue;
    }

    echo "[$name] Connecting to $ip:$port ...\n";

    $zkClient = new ZKTecoClient($ip, $port, 10);

    if (!$zkClient->connect()) {
        echo "[$name] Connection failed.\n";
        $db->patch('biometric_devices', ['id' => 'eq.' . $deviceId], [
            'last_sync_at' => date('c'),
            'sync_status'  => 'error',
            'sync_message' => "Could not connect to $ip:$port",
        ]);
        continue;
    }

    $logs = $zkClient->getAttendanceLogs();
    $zkClient->disconnect();

    echo "[$name] Got " . count($logs) . " attendance records.\n";

    $ok     = 0;
    $errors = 0;

    foreach ($logs as $log) {
        $result = $sync->process($schoolId, $log['device_user_id'], $log['scan_time'], $deviceId);
        if ($result['ok']) $ok++; else $errors++;
    }

    $db->patch('biometric_devices', ['id' => 'eq.' . $deviceId], [
        'last_sync_at' => date('c'),
        'sync_status'  => $errors > 0 ? 'error' : 'ok',
        'sync_message' => "Synced: {$ok} OK, {$errors} errors from " . count($logs) . " logs",
    ]);

    echo "[$name] Done. {$ok} OK, {$errors} errors.\n";
}

echo "Poll complete.\n";
