<?php
session_start();
require_once __DIR__ . '/db_connect.php';
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$wishlist_property_ids = [];

if (!isset($_SESSION['user_id'])) {
    echo json_encode($wishlist_property_ids); // Return empty array if not logged in
    exit();
}

$user_id = (int)$_SESSION['user_id'];

$stmt = $conn->prepare("SELECT property_id FROM wishlists WHERE user_id = ?");
if ($stmt) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $wishlist_property_ids[] = (int)$row['property_id'];
    }
    $stmt->close();
} else {
    http_response_code(500);
    error_log("Get Wishlist DB Error: " . $conn->error);
    echo json_encode(["error" => "Failed to fetch wishlist."]);
    $conn->close();
    exit();
}

$conn->close();
echo json_encode($wishlist_property_ids);
?>