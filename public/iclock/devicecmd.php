<?php
/**
 * Green Arrow HR - ADMS Device Command Execution Receiver
 * Handles device responses to commands (such as DATA QUERY ATTLOG)
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
$now = date('Y-m-d H:i:s');
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$method = $_SERVER['REQUEST_METHOD'];

$rawBody = file_get_contents('php://input');

@file_put_contents($logFile, "[$now] [$clientIp] [DEVICECMD] SN=$sn METHOD=$method BODY_LEN=" . strlen($rawBody) . "\n", FILE_APPEND);
if (!empty($rawBody)) {
    @file_put_contents($logFile, "[$now] [$clientIp] [DEVICECMD_BODY] $rawBody\n", FILE_APPEND);
}

// 1. Update device heartbeat
if (!empty($sn) && $sn !== 'UNKNOWN') {
    $devices = [];
    if (file_exists($devicesFile)) {
        $devices = json_decode(file_get_contents($devicesFile), true) ?: [];
    }
    $devices[$sn] = [
        'sn'         => $sn,
        'last_seen'  => $now,
        'ip'         => $clientIp,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'status'     => 'online',
        'last_method'=> 'DEVICECMD'
    ];
    @file_put_contents($devicesFile, json_encode($devices, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// 2. Parse any punch data contained in response (e.g. from DATA QUERY ATTLOG)
$count = 0;
if (!empty($rawBody)) {
    $existingPunches = [];
    if (file_exists($punchesFile)) {
        $existingPunches = json_decode(file_get_contents($punchesFile), true) ?: [];
    }

    $lines = preg_split('/[\r\n]+/', trim($rawBody));
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || str_starts_with($line, 'ID=') || str_starts_with($line, 'CMD=')) continue;

        $pin = '';
        $punchTime = '';
        $inOut = '0';

        // Match YYYY-MM-DD HH:MM:SS
        if (preg_match('/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/', $line, $matches, PREG_OFFSET_CAPTURE)) {
            $punchTime = $matches[1][0];
            $before = trim(substr($line, 0, $matches[1][1]), " \t,");
            $after = trim(substr($line, $matches[1][1] + strlen($punchTime)), " \t,");

            $pinParts = preg_split('/[\t,]+|\s+/', $before);
            $pin = end($pinParts);

            $afterParts = preg_split('/[\t,]+|\s+/', $after);
            $inOut = $afterParts[0] ?? '0';
        } else {
            $parts = preg_split('/[\t,]+|\s{2,}/', $line);
            if (count($parts) >= 2) {
                $pin = trim($parts[0]);
                $punchTime = trim($parts[1]);
                $inOut = isset($parts[2]) ? trim($parts[2]) : '0';
            }
        }

        if (!empty($pin) && !empty($punchTime) && preg_match('/^\d{4}-\d{2}-\d{2}/', $punchTime)) {
            $cleanTime = preg_replace('/[^0-9]/', '', $punchTime);
            $punchId = 'adms_' . $sn . '_' . $pin . '_' . $cleanTime;

            $existingPunches[$punchId] = [
                'id' => $punchId,
                'sn' => $sn,
                'enrollid' => $pin,
                'time' => $punchTime,
                'inout' => $inOut,
                'received_at' => $now,
                'source' => 'استعلام سحابي ADMS (' . $sn . ')'
            ];
            $count++;
        }
    }

    if ($count > 0) {
        @file_put_contents($punchesFile, json_encode(array_values($existingPunches), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        @file_put_contents($logFile, "[$now] [$clientIp] [DEVICECMD_PARSED] Successfully parsed $count punches from $sn\n", FILE_APPEND);
    }
}

// 3. Acknowledge with OK and command ID if present
$cmdId = '101';
if (preg_match('/ID=([0-9]+)/', $rawBody, $m)) {
    $cmdId = $m[1];
} elseif (isset($_GET['ID'])) {
    $cmdId = $_GET['ID'];
}

echo "ID=" . $cmdId . "&Return=0\n";
echo "OK\n";
