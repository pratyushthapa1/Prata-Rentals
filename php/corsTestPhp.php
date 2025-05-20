<?php
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Return test data
echo json_encode([
    "success" => true,
    "message" => "CORS test successful!",
    "timestamp" => date("Y-m-d H:i:s"),
    "server_info" => [
        "php_version" => phpversion(),
        "server" => $_SERVER['SERVER_SOFTWARE'],
        "request_uri" => $_SERVER['REQUEST_URI']
    ]
]);
