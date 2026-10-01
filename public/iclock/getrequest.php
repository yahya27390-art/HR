<?php
/**
 * Green Arrow HR - ADMS Command Dispatcher (إرسال أوامر المزامنة للأجهزة)
 * Reads pending pull flags (with optional date ranges) and sends appropriate commands to the device
 */
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

$dataDir = __DIR__ . '/../api/data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

$sn = isset($_GET['SN']) ? trim($_GET['SN']) : (isset($_POST['SN']) ? trim($_POST['SN']) : 'UNKNOWN');
$now = date('Y-m-d H:i:s');
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// Log heartbeat
$logFile = $dataDir . '/adms_raw_log.txt';
@file_put_contents($logFile, "[$now] [$clientIp] [GETREQUEST] SN=$sn\n", FILE_APPEND);

// Update device heartbeat in devices file
$devicesFile = $dataDir . '/adms_devices_live.json';
$devices = [];
if (file_exists($devicesFile)) {
    $devices = json_decode(file_get_contents($devicesFile), true) ?: [];
}
if (!empty($sn) && $sn !== 'UNKNOWN') {
    $devices[$sn] = [
        'sn'         => $sn,
        'last_seen'  => $now,
        'ip'         => $clientIp,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'status'     => 'online',
        'last_method'=> 'GETREQUEST'
    ];
    @file_put_contents($devicesFile, json_encode($devices, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$cmdFlagFile     = $dataDir . '/cmd_sent_' . $sn . '.txt';
$pendingFlagFile = $dataDir . '/pending_pull_' . $sn . '.flag';

$shouldQuery = false;
$startTime   = '';
$endTime     = '';

if (file_exists($pendingFlagFile)) {
    $shouldQuery = true;
    $payload = @json_decode(file_get_contents($pendingFlagFile), true);
    if ($payload) {
        $startTime = $payload['start'] ?? '';
        $endTime   = $payload['end']   ?? '';
    }
    @unlink($pendingFlagFile);
} elseif (!file_exists($cmdFlagFile)) {
    $shouldQuery = true;
} else {
    // Auto-refresh every 30 minutes
    $lastSent = @filemtime($cmdFlagFile);
    if ($lastSent && (time() - $lastSent) > 1800) {
        $shouldQuery = true;
    }
}

if ($shouldQuery && !empty($sn) && $sn !== 'UNKNOWN') {
    @file_put_contents($cmdFlagFile, $now);

    // Build ATTLOG query command with optional date range (ZKTeco / Ektefa ADMS protocol)
    if (!empty($startTime) && !empty($endTime)) {
        $cmd = "C:101:DATA QUERY ATTLOG StartTime:$startTime EndTime:$endTime";
    } else {
        $cmd = "C:101:DATA QUERY ATTLOG";
    }

    @file_put_contents($logFile, "[$now] [$clientIp] [DISPATCH] $cmd to $sn\n", FILE_APPEND);
    echo $cmd . "\n";
    exit;
}

echo "OK\n";
