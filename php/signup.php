<?php
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
require_once __DIR__ . '/db_connect.php';
header('Content-Type: application/json');
$response = ["success" => false, "message" => "Invalid request method."];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Rate limiting: allow max 5 attempts per 10 minutes per IP
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $rateFile = sys_get_temp_dir() . '/signup_rate_' . md5($ip);
    $attempts = 0;
    $window = 600; // 10 minutes
    if (file_exists($rateFile)) {
        $data = json_decode(file_get_contents($rateFile), true);
        if ($data && $data['expires'] > time()) {
            $attempts = $data['attempts'];
        }
    }
    if ($attempts >= 5) {
        $response['message'] = "Too many signup attempts. Please try again later.";
        http_response_code(429);
        echo json_encode($response);
        exit();
    }
    $input = json_decode(file_get_contents('php://input'), true);
    $username = isset($input['username']) ? trim($input['username']) : null;
    $email = isset($input['email']) ? trim($input['email']) : null;
    $password = isset($input['password']) ? $input['password'] : null;
    // Strict validation
    if (!preg_match('/^[a-zA-Z0-9_]{3,32}$/', $username)) {
        $response['message'] = "Username must be 3-32 characters, letters, numbers, or underscores.";
        http_response_code(400);
    } else if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $response['message'] = "Invalid email format.";
        http_response_code(400);
    } else if (strlen($password) < 8 || strlen($password) > 64) {
        $response['message'] = "Password must be 8-64 characters long.";
        http_response_code(400);
    } else {
        $stmt_check = $conn->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
        if ($stmt_check) {
            $stmt_check->bind_param("ss", $email, $username);
            $stmt_check->execute();
            $stmt_check->store_result();
            if ($stmt_check->num_rows > 0) {
                $response['message'] = "Account already exists.";
                http_response_code(409);
            } else {
                $password_hash = password_hash($password, PASSWORD_DEFAULT);
                $stmt_insert = $conn->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
                if ($stmt_insert) {
                    $stmt_insert->bind_param("sss", $username, $email, $password_hash);
                    if ($stmt_insert->execute()) {
                        $response = ["success" => true, "message" => "Registration successful! You can now log in."];
                    } else {
                        $response['message'] = "Registration failed. Please try again later.";
                        error_log("Signup Insert DB Error: " . $stmt_insert->error);
                        http_response_code(500);
                    }
                    $stmt_insert->close();
                } else {
                    $response['message'] = "An error occurred during registration.";
                    error_log("Signup Prepare Insert DB Error: " . $conn->error);
                    http_response_code(500);
                }
            }
            $stmt_check->close();
        } else {
            $response['message'] = "An error occurred. Please try again.";
            error_log("Signup Prepare Check DB Error: " . $conn->error);
            http_response_code(500);
        }
    }
    // Update rate limiting file
    $attempts++;
    file_put_contents($rateFile, json_encode(["attempts" => $attempts, "expires" => time() + $window]));
}
$conn->close();
echo json_encode($response);
?>