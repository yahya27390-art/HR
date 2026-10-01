<?php
/**
 * Green Arrow HR - ADMS Cloud Receiver (مستقبل حركات البصمة السحابية)
 * Handles Ektefa & ZKTeco Cloud Server / ADMS Push Protocol
 */

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

$dataDir = __DIR__ . '/../api/data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

$devicesFile = $dataDir . '/adms_devices_live.json';
$punchesFile = $dataDir . '/adms_punches_live.json';
$logFile     = $dataDir . '/adms_raw_log.txt';

$sn = isset($_GET['SN']) ? trim($_GET['SN']) : (isset($_POST['SN']) ? trim($_POST['SN']) : 'UNKNOWN');
$table = isset($_GET['table']) ? trim($_GET['table']) : (isset($_POST['table']) ? trim($_POST['table']) : '');
$method = $_SERVER['REQUEST_METHOD'];
$now = date('Y-m-d H:i:s');
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$uri = $_SERVER['REQUEST_URI'] ?? '';
@file_put_contents($logFile, "[$now] [$clientIp] [$method] URI=$uri SN=$sn\n", FILE_APPEND);


$devices = [];
if (file_exists($devicesFile)) {
    $devices = json_decode(file_get_contents($devicesFile), true) ?: [];
}
if (!empty($sn) && $sn !== 'UNKNOWN') {
    $devices[$sn] = [
        'sn' => $sn,
        'last_seen' => $now,
        'ip' => $clientIp,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'status' => 'online',
        'last_method' => $method
    ];
    @file_put_contents($devicesFile, json_encode($devices, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// 2. Handle Handshake GET request
if ($method === 'GET') {
    @file_put_contents($logFile, "[$now] [$clientIp] [HANDSHAKE] SN=$sn GET\n", FILE_APPEND);
    // Standard ZKTeco / Ektefa ADMS handshake response
    echo "GET OPTION FROM: " . $sn . "\n";
    echo "ATTLOGStamp=0\n";
    echo "OPERLOGStamp=0\n";
    echo "ATTPHOTOStamp=0\n";
    echo "ErrorDelay=5\n";
    echo "Delay=5\n";
    echo "TransTimes=00:00;14:05\n";
    echo "TransInterval=1\n";
    echo "TransFlag=1111111111\n";
    echo "TimeZone=3\n";
    echo "Realtime=1\n";
    echo "Encrypt=0\n";
    exit;
}

// 3. Handle POST Attendance Punches
if ($method === 'POST') {
    $rawBody = file_get_contents('php://input');
    @file_put_contents($logFile, "[$now] [$clientIp] [$sn] [$table] RAW: $rawBody\n", FILE_APPEND);

    $count = 0;
    $existingPunches = [];
    if (file_exists($punchesFile)) {
        $existingPunches = json_decode(file_get_contents($punchesFile), true) ?: [];
    }

    if (!empty($rawBody)) {
        $lines = preg_split('/[\r\n]+/', trim($rawBody));
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;

            $pin = '';
            $punchTime = '';
            $inOut = '0';

            // Match DateTime pattern: YYYY-MM-DD HH:MM:SS
            if (preg_match('/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/', $line, $dateMatches, PREG_OFFSET_CAPTURE)) {
                $punchTime = $dateMatches[1][0];
                $before = trim(substr($line, 0, $dateMatches[1][1]), " \t,");
                $after = trim(substr($line, $dateMatches[1][1] + strlen($punchTime)), " \t,");

                // Before is typically the PIN/Enroll ID
                $pinParts = preg_split('/[\t,]+|\s+/', $before);
                $pin = end($pinParts);

                // After contains Status (0=check-in, 1=check-out, 4=overtime in, 5=overtime out)
                $afterParts = preg_split('/[\t,]+|\s+/', $after);
                $inOut = $afterParts[0] ?? '0';
            } else {
                // Fallback tab/whitespace split
                $parts = preg_split('/[\t,]+|\s{2,}/', $line);
                if (count($parts) >= 2) {
                    $pin = trim($parts[0]);
                    $punchTime = trim($parts[1]);
                    $inOut = isset($parts[2]) ? trim($parts[2]) : '0';
                }
            }

            if (!empty($pin) && !empty($punchTime)) {
                $cleanTime = preg_replace('/[^0-9]/', '', $punchTime);
                $punchId = 'adms_' . $sn . '_' . $pin . '_' . $cleanTime;
                
                $existingPunches[$punchId] = [
                    'id' => $punchId,
                    'sn' => $sn,
                    'enrollid' => $pin,
                    'time' => $punchTime,
                    'inout' => $inOut,
                    'received_at' => $now,
                    'source' => 'بصمة سحابية ADMS (EK0201000043)'
                ];
                $count++;
            }
        }

        @file_put_contents($punchesFile, json_encode(array_values($existingPunches), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    echo "OK: " . $count . "\n";
    exit;
}

echo "OK\n";
