<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once 'db_connect.php';
$input = json_decode(file_get_contents('php://input'), true);
$email = isset($input['email']) ? trim($input['email']) : '';
$code = isset($input['code']) ? trim($input['code']) : '';
if (!$email || !$code) {
    echo json_encode(['success' => false, 'message' => 'Email and code are required.']);
    exit;
}
$stmt = $conn->prepare('SELECT expires_at FROM password_resets WHERE email = ? AND code = ? LIMIT 1');
$stmt->bind_param('ss', $email, $code);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 1) {
    $row = $result->fetch_assoc();
    if (strtotime($row['expires_at']) > time()) {
        echo json_encode(['success' => true]);
        exit;
    } else {
        echo json_encode(['success' => false, 'message' => 'Code expired.']);
        exit;
    }
}
echo json_encode(['success' => false, 'message' => 'Invalid code.']);
exit;