<?php
require_once __DIR__ . '/db_connect.php';
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$property_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$property = null;

if ($property_id > 0) {
    $sql = "SELECT p.*, u.username AS owner_username, u.email AS owner_email
            FROM properties p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?";
    $stmt = $conn->prepare($sql);

    if ($stmt) {
        $stmt->bind_param("i", $property_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 1) {
            $property = $result->fetch_assoc();
            if (isset($property['image_url_1'])) {
                $property['imageURL'] = $property['image_url_1'];
            }
            foreach (['id', 'user_id', 'bedrooms', 'bathrooms'] as $key) {
                if (isset($property[$key])) $property[$key] = (int)$property[$key];
            }
            foreach (['price', 'area'] as $key) {
                if (isset($property[$key])) $property[$key] = (float)$property[$key];
            }
            $property['image_urls_array'] = isset($property['image_urls_array']) ? json_decode($property['image_urls_array'], true) : [];
            if (json_last_error() !== JSON_ERROR_NONE) $property['image_urls_array'] = [];
            $property['features_array'] = isset($property['features_array']) ? json_decode($property['features_array'], true) : [];
            if (json_last_error() !== JSON_ERROR_NONE) $property['features_array'] = [];
            $response = [
                'success' => true,
                'property' => $property
            ];
            echo json_encode($response);
            $stmt->close();
            $conn->close();
            exit();
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Property not found."]);
            $stmt->close();
            $conn->close();
            exit();
        }
    } else {
        http_response_code(500);
        error_log("Get Property Details DB Error: " . $conn->error);
        echo json_encode(["success" => false, "message" => "Database query error."]);
        $conn->close();
        exit();
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid property ID."]);
    $conn->close();
    exit();
}

$conn->close();
echo json_encode($property);
?>