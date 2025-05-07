<?php
// api/db_connect.php
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "prata_rentals_db";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        "success" => false,
        "error" => "Database connection failed",
        "debug_message" => $conn->connect_error
    ]);
    exit();
}

// Set charset
$conn->set_charset("utf8mb4");
