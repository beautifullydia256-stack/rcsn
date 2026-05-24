<?php
/**
 * ZKTeco F18 Adapter — HTTP Push (ADMS) parser.
 *
 * When ZKTeco devices are configured in ADMS cloud mode, they POST attendance
 * records as URL-encoded form data:
 *   table=ATTLOG&Stamp=...&UserID=104&AttTime=2026-05-24+08:03:22&VerifyCode=1&AttType=0
 *
 * AttType: 0=check-in, 1=check-out, 4=break-out, 5=break-in
 *
 * Returns a normalized event or null.
 */
class ZKTecoAdapter {
    public static function parseAdmsPush(): ?array {
        $table    = $_POST['table']    ?? $_GET['table']    ?? null;
        $userId   = $_POST['UserID']   ?? $_GET['UserID']   ?? null;
        $attTime  = $_POST['AttTime']  ?? $_GET['AttTime']  ?? null;
        $attType  = (int)($_POST['AttType'] ?? $_GET['AttType'] ?? 0);

        // Device sends heartbeat pings with table=OPERLOG — ignore those
        if ($table !== 'ATTLOG' || !$userId || !$attTime) return null;

        // AttTime format: "2026-05-24 08:03:22" (device local time, assumed EAT)
        $scanTime = str_replace(' ', 'T', trim($attTime)) . '+03:00';

        return [
            'device_user_id' => trim($userId),
            'scan_time'      => $scanTime,
            'att_type'       => $attType, // 0=in, 1=out
        ];
    }

    /** ZKTeco ADMS requires specific HTTP responses to avoid the device retrying. */
    public static function ackAdms(): void {
        header('Content-Type: text/plain');
        echo "OK"; // ZKTeco expects exactly this
    }
}
