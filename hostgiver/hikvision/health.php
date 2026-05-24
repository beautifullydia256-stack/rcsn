<?php
// Health check — confirm the middleware is reachable
// Visit: http://yourdomain.com/hikvision/health.php
require_once __DIR__ . '/config.php';

$ch = curl_init(SUPABASE_URL . '/rest/v1/schools?select=school_id&limit=1');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 5,
    CURLOPT_HTTPHEADER => [
        'apikey: ' . SUPABASE_SERVICE_KEY,
        'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
    ],
]);
curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$ok = ($code === 200);
http_response_code($ok ? 200 : 503);
header('Content-Type: application/json');
echo json_encode([
    'status'    => $ok ? 'ok' : 'error',
    'supabase'  => $ok ? 'reachable' : 'unreachable (HTTP ' . $code . ')',
    'php'       => PHP_VERSION,
    'curl'      => function_exists('curl_init') ? 'enabled' : 'MISSING',
    'timestamp' => date('c'),
]);
