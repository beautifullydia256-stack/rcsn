<?php
/**
 * Minimal Supabase REST API client using cURL.
 * No Composer required — works on any shared hosting with PHP + cURL.
 */
class SupabaseClient {
    private string $url;
    private string $key;

    public function __construct(string $url, string $key) {
        $this->url = rtrim($url, '/');
        $this->key = $key;
    }

    private function headers(): array {
        return [
            'apikey: '        . $this->key,
            'Authorization: Bearer ' . $this->key,
            'Content-Type: application/json',
        ];
    }

    /** SELECT rows from a table with optional filters.
     *  $filters: ['column' => 'eq.value', ...]  (PostgREST filter syntax)
     */
    public function select(string $table, string $select = '*', array $filters = [], int $limit = 1000): ?array {
        $params = array_merge(['select' => $select, 'limit' => $limit], $filters);
        $url = $this->url . '/rest/v1/' . $table . '?' . http_build_query($params);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $this->headers(),
            CURLOPT_TIMEOUT        => 10,
        ]);
        $body = curl_exec($ch);
        curl_close($ch);
        $data = json_decode($body, true);
        return is_array($data) ? $data : null;
    }

    /** INSERT a row. Returns HTTP status code. */
    public function insert(string $table, array $payload, string $prefer = 'return=minimal'): int {
        $ch = curl_init($this->url . '/rest/v1/' . $table);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => array_merge($this->headers(), ['Prefer: ' . $prefer]),
            CURLOPT_TIMEOUT        => 10,
        ]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $code;
    }

    /** PATCH (update) rows matching filters. Returns HTTP status code. */
    public function patch(string $table, array $filters, array $payload): int {
        $url = $this->url . '/rest/v1/' . $table . '?' . http_build_query($filters);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'PATCH',
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => array_merge($this->headers(), ['Prefer: return=minimal']),
            CURLOPT_TIMEOUT        => 10,
        ]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $code;
    }

    /** SELECT a single row. Returns the row or null. */
    public function single(string $table, string $select, array $filters): ?array {
        $rows = $this->select($table, $select, $filters, 1);
        return !empty($rows) ? $rows[0] : null;
    }
}
