<?php
/**
 * ZKTeco TCP Binary Protocol Client
 * Tested against: ZKTeco F18, F19, K40, iClock series
 * Protocol: ZKTeco SDK over TCP port 4370
 *
 * This client polls the device for attendance logs.
 * No Composer / SDK required — pure PHP sockets.
 */
class ZKTecoClient {
    private string $ip;
    private int    $port;
    private int    $timeout;

    /** @var resource|false */
    private $socket = false;
    private int $sessionId = 0;
    private int $replyId   = 0xFFFF;

    // ZKTeco command codes
    const CMD_CONNECT       = 1000;
    const CMD_EXIT          = 1001;
    const CMD_ACK_OK        = 2000;
    const CMD_ACK_ERROR     = 2001;
    const CMD_ATTLOG_RRQ    = 13;    // Request attendance log table
    const CMD_DATA          = 16;    // Data chunk
    const CMD_FREE_DATA     = 18;    // Done sending data
    const CMD_PREPARE_DATA  = 15;    // Announces large data
    const CMD_DB_RRQ        = 13;
    const CMD_OPTIONS_RRQ   = 1011;  // Get device info

    // Attendance status codes
    const STATUS_IN         = 0;
    const STATUS_OUT        = 1;

    public function __construct(string $ip, int $port = 4370, int $timeout = 10) {
        $this->ip      = $ip;
        $this->port    = $port;
        $this->timeout = $timeout;
    }

    // ── Packet helpers ────────────────────────────────────────────────────────

    private function calcChecksum(string $pkt): int {
        $len = strlen($pkt);
        $sum = 0;
        $i   = 0;
        while ($len > 1) {
            $w    = ord($pkt[$i]) | (ord($pkt[$i + 1]) << 8);
            $sum  = ($sum + $w) & 0xFFFF;
            $len -= 2;
            $i   += 2;
        }
        if ($len) $sum = ($sum + ord($pkt[$i])) & 0xFFFF;
        return ((~$sum + 1) & 0xFFFF);
    }

    private function makePacket(int $cmd, string $data = ''): string {
        $this->replyId = ($this->replyId + 1) & 0xFFFF;
        // Header with zero checksum for calculation
        $buf     = pack('vvvv', $cmd, 0, $this->sessionId, $this->replyId) . $data;
        $chksum  = $this->calcChecksum($buf);
        return pack('vvvv', $cmd, $chksum, $this->sessionId, $this->replyId) . $data;
    }

    private function send(string $pkt): void {
        fwrite($this->socket, $pkt);
    }

    private function recv(int $size = 1024): string {
        $buf = '';
        $end = microtime(true) + $this->timeout;
        while (strlen($buf) < 8 && microtime(true) < $end) {
            $chunk = fread($this->socket, $size);
            if ($chunk === false) break;
            $buf .= $chunk;
        }
        return $buf;
    }

    private function recvAll(int $expectedSize): string {
        $buf = '';
        $end = microtime(true) + $this->timeout * 2;
        while (strlen($buf) < $expectedSize && microtime(true) < $end) {
            $chunk = fread($this->socket, 4096);
            if ($chunk === false || $chunk === '') break;
            $buf .= $chunk;
        }
        return $buf;
    }

    private function parseHeader(string $data): array {
        if (strlen($data) < 8) return ['cmd' => 0, 'session' => 0, 'reply' => 0, 'data' => ''];
        $h = unpack('vcmd/vchksum/vsession/vreply', substr($data, 0, 8));
        return ['cmd' => $h['cmd'], 'session' => $h['session'], 'reply' => $h['reply'], 'data' => substr($data, 8)];
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public function connect(int $password = 0): bool {
        $this->socket = @fsockopen($this->ip, $this->port, $errno, $errstr, $this->timeout);
        if (!$this->socket) return false;
        stream_set_timeout($this->socket, $this->timeout);

        // CMD_CONNECT
        $this->replyId   = 0xFFFF;
        $this->sessionId = 0;
        $this->send($this->makePacket(self::CMD_CONNECT));
        $resp = $this->recv();
        if (strlen($resp) < 8) return false;
        $h = $this->parseHeader($resp);
        if ($h['cmd'] !== self::CMD_ACK_OK) return false;
        $this->sessionId = $h['session'];
        return true;
    }

    /**
     * Pull all attendance logs from the device.
     * Returns array of ['device_user_id', 'scan_time' (ISO 8601 string), 'status_code'].
     */
    public function getAttendanceLogs(): array {
        if (!$this->socket) return [];

        // Request attendance log table
        $this->send($this->makePacket(self::CMD_DB_RRQ, "ATTLOG\x00"));
        $resp = $this->recv(2048);
        if (strlen($resp) < 8) return [];
        $h = $this->parseHeader($resp);

        $rawData = '';

        if ($h['cmd'] === self::CMD_PREPARE_DATA) {
            // Device is sending a large response — first 4 bytes of data = total size
            $totalSize = unpack('V', substr($h['data'], 0, 4))[1] ?? 0;
            // Collect data chunks
            $rawData = $h['data'];   // might already contain some data after the size header
            $end = microtime(true) + $this->timeout * 3;
            while (strlen($rawData) < $totalSize + 4 && microtime(true) < $end) {
                $chunk = fread($this->socket, 4096);
                if ($chunk === false || $chunk === '') break;
                $cr = $this->parseHeader($chunk);
                if ($cr['cmd'] === self::CMD_DATA) {
                    $rawData .= $cr['data'];
                } elseif ($cr['cmd'] === self::CMD_FREE_DATA || $cr['cmd'] === self::CMD_ACK_OK) {
                    break;
                }
            }
            // Strip the 4-byte size prefix
            $rawData = substr($rawData, 4);
        } elseif ($h['cmd'] === self::CMD_DATA || $h['cmd'] === self::CMD_ACK_OK) {
            $rawData = $h['data'];
        } else {
            return [];
        }

        return $this->parseRecords($rawData);
    }

    /**
     * Clear attendance logs on device after successful sync.
     * Call this only if you want to reset the device log.
     */
    public function clearAttendanceLogs(): void {
        if (!$this->socket) return;
        $this->send($this->makePacket(9, "ATTLOG\x00")); // CMD_DELETE_DATA = 9
    }

    public function disconnect(): void {
        if ($this->socket) {
            $this->send($this->makePacket(self::CMD_EXIT));
            fclose($this->socket);
            $this->socket = false;
        }
    }

    // ── Record parsing ────────────────────────────────────────────────────────

    private function parseRecords(string $data): array {
        $records = [];
        $len     = strlen($data);
        $pos     = 0;
        $recSize = 40; // ZKTeco "new" protocol record size

        while ($pos + $recSize <= $len) {
            $rec = substr($data, $pos, $recSize);
            $pos += $recSize;

            // Layout (40 bytes, ZKTeco new protocol):
            // 0-1:   internal sequence (uint16)
            // 2-10:  user_id string (9 bytes, null-padded)
            // 11:    verify type
            // 12:    reserved
            // 13-16: timestamp (uint32 LE, ZKTeco epoch)
            // 17:    status code (0=in, 1=out, 4=break-out...)
            // 18-39: reserved
            $userId    = rtrim(substr($rec, 2, 9), "\x00");
            $tsRaw     = unpack('V', substr($rec, 13, 4))[1] ?? 0;
            $statusCode = ord($rec[17] ?? "\x00");

            if (!$userId || !$tsRaw) continue;

            $scanTime = $this->decodeZKTime($tsRaw);
            if (!$scanTime) continue;

            $records[] = [
                'device_user_id' => trim($userId),
                'scan_time'      => $scanTime,
                'status_code'    => $statusCode,   // 0=check-in, 1=check-out
            ];
        }

        return $records;
    }

    /**
     * ZKTeco time encoding:
     *   value = ((year-2000)*12*31 + (month-1)*31 + (day-1)) * 86400
     *           + hour*3600 + minute*60 + second
     */
    private function decodeZKTime(int $t): ?string {
        if ($t === 0) return null;
        $second = $t % 60; $t = intdiv($t, 60);
        $minute = $t % 60; $t = intdiv($t, 60);
        $hour   = $t % 24; $t = intdiv($t, 24);
        $day    = ($t % 31) + 1; $t = intdiv($t, 31);
        $month  = ($t % 12) + 1; $t = intdiv($t, 12);
        $year   = $t + 2000;
        if ($year < 2000 || $year > 2100 || $month < 1 || $month > 12 || $day < 1 || $day > 31) return null;
        return sprintf('%04d-%02d-%02dT%02d:%02d:%02d+03:00', $year, $month, $day, $hour, $minute, $second);
    }
}
