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
if ($result->num_rows !== 1) {
    echo json_encode(['success' => false, 'message' => 'No account found with that email.']);
    exit;
}
$code = rand(100000, 999999);
$expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));
$stmt = $conn->prepare('REPLACE INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)');
$stmt->bind_param('sis', $email, $code, $expires);
$stmt->execute();
// Send email (simple mail, replace with your mail logic)
$subject = 'Your PRATA Password Reset Code';
$message = "Your password reset code is: $code\nThis code expires in 15 minutes.";
$headers = 'From: no-reply@prata.com';
mail($email, $subject, $message, $headers);
echo json_encode(['success' => true]);
exit;