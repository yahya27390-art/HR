<?php
/**
 * Green Arrow HR - API to provide live ADMS punches and device status to React app
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

$devicesFile = $dataDir . '/adms_devices_live.json';
$punchesFile = $dataDir . '/adms_punches_live.json';
$rawLogFile  = $dataDir . '/adms_raw_log.txt';

$action    = $_GET['action'] ?? ($_POST['action'] ?? 'status');
$sn        = $_GET['sn']     ?? ($_POST['sn']     ?? '');
$startTime = $_GET['start']  ?? ($_POST['start']  ?? '');
$endTime   = $_GET['end']    ?? ($_POST['end']    ?? '');

// Action: Trigger an immediate punch download command on next device poll
if ($action === 'request_pull') {
    if (!empty($sn)) {
        $flagFile = $dataDir . '/cmd_sent_' . $sn . '.txt';
        if (file_exists($flagFile)) {
            @unlink($flagFile);
        }
        $pendingFile = $dataDir . '/pending_pull_' . $sn . '.flag';

        // Store date range in the pending flag file so getrequest.php can use it
        $payload = [
            'queued_at' => date('Y-m-d H:i:s'),
            'start'     => $startTime,
            'end'       => $endTime
        ];
        @file_put_contents($pendingFile, json_encode($payload));
    }
    echo json_encode([
        'status'    => 'success',
        'message'   => 'تم تسجيل أمر سحب الحركات للجهاز: ' . ($sn ?: 'جميع الأجهزة'),
        'sn'        => $sn,
        'start'     => $startTime,
        'end'       => $endTime,
        'queued_at' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Action: Clear all stored punches (reset)
if ($action === 'reset_punches') {
    @file_put_contents($punchesFile, json_encode([]));
    echo json_encode([
        'status'  => 'success',
        'message' => 'تم حذف جميع الحركات المخزنة مؤقتاً على السيرفر'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

$devices = file_exists($devicesFile) ? (json_decode(file_get_contents($devicesFile), true) ?: []) : [];
$punches = file_exists($punchesFile) ? (json_decode(file_get_contents($punchesFile), true) ?: []) : [];

// Optional date filter for punches returned
if (!empty($startTime) && !empty($endTime)) {
    $punches = array_values(array_filter($punches, function ($p) use ($startTime, $endTime) {
        $t = $p['time'] ?? '';
        return $t >= $startTime && $t <= $endTime;
    }));
}

$recentLogs = [];
if (!empty($_GET['logs']) && file_exists($rawLogFile)) {
    $lines      = file($rawLogFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $recentLogs = array_slice($lines ?: [], -100);
}

echo json_encode([
    'status'        => 'success',
    'devices'       => $devices ?: (object)[],
    'punches'       => $punches ?: [],
    'total_punches' => count($punches ?: []),
    'recent_logs'   => $recentLogs,
    'server_time'   => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
