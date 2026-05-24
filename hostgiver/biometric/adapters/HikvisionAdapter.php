<?php
/**
 * Hikvision DS-K1A802F Adapter
 * Parses ISAPI event push (XML or JSON, raw or multipart).
 *
 * Returns a normalized event:
 *   ['device_user_id' => '104', 'scan_time' => '2026-05-24T08:03:22+03:00']
 * or null if the payload cannot be parsed.
 */
class HikvisionAdapter {
    public static function parseEvent(): ?array {
        $rawBody     = '';
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

        // Some Hikvision models send multipart/form-data with an XML file
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
        if (!$rawBody) return null;

        if (strpos(ltrim($rawBody), '{') === 0) {
            return self::parseJson($rawBody);
        }
        return self::parseXml($rawBody);
    }

    private static function parseJson(string $body): ?array {
        $data = json_decode($body, true);
        if (!is_array($data)) return null;
        $userId = (string)($data['employeeNoString'] ?? $data['employeeNo'] ?? $data['AcsEvent']['employeeNoString'] ?? '');
        $time   = (string)($data['time'] ?? $data['dateTime'] ?? $data['AcsEvent']['time'] ?? '');
        return $userId ? ['device_user_id' => trim($userId), 'scan_time' => $time] : null;
    }

    private static function parseXml(string $body): ?array {
        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($body);
        if (!$xml) return null;
        $acs    = $xml->AcsEvent ?? null;
        $userId = trim((string)($acs->employeeNoString ?? $xml->employeeNoString ?? ''));
        $time   = (string)($acs->time ?? $xml->dateTime ?? $xml->time ?? '');
        return $userId ? ['device_user_id' => $userId, 'scan_time' => $time] : null;
    }
}
