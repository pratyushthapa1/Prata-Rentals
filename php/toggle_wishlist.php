<?php
session_start();
require_once 'db_connect.php';
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$response = ["success" => false, "message" => "Invalid request."];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SESSION['user_id'])) {
    $input = json_decode(file_get_contents('php://input'), true);
    $user_id = (int)$_SESSION['user_id'];
    $property_id = isset($input['propertyId']) ? (int)$input['propertyId'] : 0;
    $action = isset($input['action']) ? $input['action'] : null;

    if ($property_id > 0 && ($action === 'add' || $action === 'remove')) {
        if ($action === 'add') {
            // INSERT IGNORE will not insert if the unique constraint (user_id, property_id) is violated
            $stmt = $conn->prepare("INSERT IGNORE INTO wishlists (user_id, property_id) VALUES (?, ?)");
            if ($stmt) {
                $stmt->bind_param("ii", $user_id, $property_id);
                if ($stmt->execute()) {
                    $response = ["success" => true, "message" => "Wishlist updated."];
                    if ($stmt->affected_rows > 0) {
                         $response['action_taken'] = 'added';
                    } else {
                         $response['action_taken'] = 'already_exists';
                    }
                } else { /* ... handle statement error ... */ $response['message'] = "Error."; http_response_code(500); }
                $stmt->close();
            } else { /* ... handle prepare error ... */ $response['message'] = "Database error."; http_response_code(500); }
        } elseif ($action === 'remove') {
            $stmt = $conn->prepare("DELETE FROM wishlists WHERE user_id = ? AND property_id = ?");
            if ($stmt) {
                $stmt->bind_param("ii", $user_id, $property_id);
                if ($stmt->execute()) {
                    $response = ["success" => true, "message" => "Wishlist updated."];
                     if ($stmt->affected_rows > 0) {
                         $response['action_taken'] = 'removed';
                    } else {
                         $response['action_taken'] = 'not_found';
                    }
                } else { /* ... handle statement error ... */ $response['message'] = "Error."; http_response_code(500); }
                $stmt->close();
            } else { /* ... handle prepare error ... */ $response['message'] = "Database error."; http_response_code(500); }
        }
    } else { /* ... handle missing params ... */ $response['message'] = "Missing params."; http_response_code(400); }
} else if (!isset($_SESSION['user_id'])) { /* ... handle not authenticated ... */ $response['message'] = "Not authenticated."; http_response_code(401); }

$conn->close();
echo json_encode($response);
?>