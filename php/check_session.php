<?php
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();
require_once __DIR__ . '/db_connect.php';
header('Content-Type: application/json');

$response = ["loggedIn" => false];

if (isset($_SESSION['user_id'])) {
    $userId = $_SESSION['user_id'];

    $sql = "SELECT id, username, email FROM users WHERE id = ? LIMIT 1";
    $stmt = $conn->prepare($sql);

    if ($stmt) {
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            $response["loggedIn"] = true;
            $response["user"] = [
                "id" => (int)$user['id'],
                "username" => $user['username'],
                "email" => $user['email']
            ];
        } else {
            unset($_SESSION['user_id']);
            $response["loggedIn"] = false;
            $response["message"] = "Session invalidated; user not found.";
        }

        $stmt->close();
    } else {
        $response["error"] = "Database query error.";
        error_log("Statement prepare failed: " . $conn->error);
    }
}

$conn->close();
echo json_encode($response);
