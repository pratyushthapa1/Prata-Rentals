<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
require_once __DIR__ . '/db_connect.php';
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(["success" => false, "message" => "Invalid input."]);
    exit();
}
// Example: expecting 'username', 'property_id', 'checkin', 'checkout', 'guests', 'payment_method'
$username = $input['username'] ?? null;
$property_id = $input['property_id'] ?? null;
$checkin = $input['checkin'] ?? null;
$checkout = $input['checkout'] ?? null;
$guests = $input['guests'] ?? null;
$payment_method = $input['payment_method'] ?? null;

// Validate required fields for all methods
if (!$username || !$property_id || !$checkin || !$checkout || !$guests || !$payment_method) {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
    exit();
}
// Validate payment fields based on method
if ($payment_method === 'card') {
    if (empty($input['card_number']) || empty($input['expiry_date']) || empty($input['cvv']) || empty($input['card_name'])) {
        echo json_encode(["success" => false, "message" => "Missing card details."]);
        exit();
    }
} elseif ($payment_method === 'esewa') {
    if (empty($input['esewa_id'])) {
        echo json_encode(["success" => false, "message" => "Missing eSewa ID."]);
        exit();
    }
    // Here you would integrate with eSewa API using test credentials
} elseif ($payment_method === 'khalti') {
    if (empty($input['khalti_id'])) {
        echo json_encode(["success" => false, "message" => "Missing Khalti ID."]);
        exit();
    }
    // Here you would integrate with Khalti API
} else {
    echo json_encode(["success" => false, "message" => "Invalid payment method."]);
    exit();
}
// Insert booking (store payment method and reference, but not sensitive details)
$stmt = $conn->prepare("INSERT INTO bookings (username, property_id, checkin, checkout, guests, payment_method, payment_reference) VALUES (?, ?, ?, ?, ?, ?, ?)");
$payment_reference = $payment_method === 'card' ? substr($input['card_number'], -4) : ($input['esewa_id'] ?? $input['khalti_id'] ?? '');
$stmt->bind_param("sississ", $username, $property_id, $checkin, $checkout, $guests, $payment_method, $payment_reference);
if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "Database error."]);
}
$stmt->close();
$conn->close();