<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once 'db_connect.php';
$input = json_decode(file_get_contents('php://input'), true);
$email = isset($input['email']) ? trim($input['email']) : '';
if (!$email) {
    echo json_encode(['success' => false, 'message' => 'Email is required.']);
    exit;
}
$stmt = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 1) {
    echo json_encode(['success' => true]);
    exit;
}
echo json_encode(['success' => false, 'message' => 'No account found with that email.']);
exit;