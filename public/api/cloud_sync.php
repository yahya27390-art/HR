<?php
/**
 * Green Arrow HR - Centralized Cloud Sync Engine (PHP Backend)
 * Solves cross-device synchronization for Payroll, Employees, Allowances, and Approvals.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

$syncDir = $dataDir . '/sync_store';
if (!is_dir($syncDir)) {
    @mkdir($syncDir, 0755, true);
}

function sanitizeKey($key) {
    $clean = preg_replace('/[^a-zA-Z0-9_\-]/', '_', (string)$key);
    return substr($clean, 0, 80);
}

// Read raw body if POST
$rawInput = file_get_contents('php://input');
$bodyJson = null;
if (!empty($rawInput)) {
    $bodyJson = json_decode($rawInput, true);
}

$action = $_GET['action'] ?? ($bodyJson['action'] ?? ($_POST['action'] ?? 'get_all'));
$key    = $_GET['key']    ?? ($bodyJson['key']    ?? ($_POST['key']    ?? ''));

// ACTION 1: GET SINGLE KEY
if ($action === 'get') {
    if (empty($key)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Key is required']);
        exit;
    }
    $safe = sanitizeKey($key);
    $filePath = $syncDir . '/' . $safe . '.json';
    if (file_exists($filePath)) {
        $content = file_get_contents($filePath);
        $data = json_decode($content, true);
        echo json_encode([
            'status' => 'success',
            'key' => $key,
            'data' => $data !== null ? $data : $content,
            'updated_at' => date('Y-m-d H:i:s', filemtime($filePath))
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            'status' => 'not_found',
            'key' => $key,
            'data' => null
        ]);
    }
    exit;
}

// ACTION 2: SET SINGLE KEY
if ($action === 'set') {
    if (empty($key)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Key is required']);
        exit;
    }
    $safe = sanitizeKey($key);
    $filePath = $syncDir . '/' . $safe . '.json';
    $dataToSave = isset($bodyJson['data']) ? $bodyJson['data'] : ($_POST['data'] ?? null);

    if ($dataToSave === null) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Data is required']);
        exit;
    }

    $jsonStr = is_string($dataToSave) ? $dataToSave : json_encode($dataToSave, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    $ok = @file_put_contents($filePath, $jsonStr, LOCK_EX);

    if ($ok !== false) {
        echo json_encode([
            'status' => 'success',
            'key' => $key,
            'bytes' => $ok,
            'updated_at' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to write file to storage']);
    }
    exit;
}

// ACTION 3: BATCH SET MULTIPLE KEYS
if ($action === 'batch_set') {
    $items = $bodyJson['items'] ?? null;
    if (!is_array($items)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Items object/map is required']);
        exit;
    }
    $saved = 0;
    foreach ($items as $k => $v) {
        if (!empty($k)) {
            $safe = sanitizeKey($k);
            $filePath = $syncDir . '/' . $safe . '.json';
            $jsonStr = is_string($v) ? $v : json_encode($v, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            if (@file_put_contents($filePath, $jsonStr, LOCK_EX) !== false) {
                $saved++;
            }
        }
    }
    echo json_encode([
        'status' => 'success',
        'saved_count' => $saved,
        'updated_at' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ACTION 4: GET ALL SYNCED DATASETS
if ($action === 'get_all') {
    $files = glob($syncDir . '/*.json');
    $results = [];
    if ($files) {
        foreach ($files as $f) {
            $baseName = basename($f, '.json');
            $raw = @file_get_contents($f);
            if ($raw !== false) {
                $decoded = json_decode($raw, true);
                $results[$baseName] = ($decoded !== null) ? $decoded : $raw;
            }
        }
    }
    echo json_encode([
        'status' => 'success',
        'count' => count($results),
        'data' => $results,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Default fallback
echo json_encode(['status' => 'error', 'message' => 'Invalid action: ' . htmlspecialchars($action)]);
