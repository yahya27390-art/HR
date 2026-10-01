<?php
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'status' => 'success',
    'message' => 'PHP is working on Hostinger!',
    'time' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION
]);
