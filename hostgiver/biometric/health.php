<?php
/**
 * Health check endpoint
 * Visit: https://yourdomain.com/biometric/health.php
 * Verifies PHP, cURL, sockets, and Supabase connectivity.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/SupabaseClient.php';

$checks = [
    'php'       => PHP_VERSION,
    'curl'      => function_exists('curl_init') ? 'enabled' : 'MISSING',
    'sockets'   => function_exists('fsockopen') ? 'enabled' : 'MISSING',
    'timezone'  => TIMEZONE,
];

// Test Supabase
$db     = new SupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
$rows   = $db->select('biometric_devices', 'id', [], 1);
$checks['supabase'] = ($rows !== null) ? 'ok' : 'UNREACHABLE';

// Count registered devices
if ($rows !== null) {
    $all = $db->select('biometric_devices', 'id,device_type,is_active', [], 500);
    $checks['devices_total']  = count($all ?? []);
    $checks['devices_active'] = count(array_filter($all ?? [], fn($d) => $d['is_active']));
}

$allOk = ($checks['curl'] === 'enabled') && ($checks['supabase'] === 'ok');
http_response_code($allOk ? 200 : 503);
header('Content-Type: application/json');
echo json_encode(array_merge(['status' => $allOk ? 'ok' : 'degraded', 'timestamp' => date('c')], $checks), JSON_PRETTY_PRINT);
