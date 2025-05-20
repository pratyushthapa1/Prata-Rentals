<?php
// api/get_properties_by_ids.php
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
require_once __DIR__ . '/db_connect.php'; // <-- Add this line
$property_ids_str = isset($_GET['ids']) ? $_GET['ids'] : '';
$properties = [];

if (!empty($property_ids_str)) {
    // Sanitize and validate IDs
    $ids_array = array_map('intval', explode(',', $property_ids_str));
    $ids_array = array_filter($ids_array, function($id) { return $id > 0; }); // Keep only positive integers

    if (!empty($ids_array)) {
        $placeholders = implode(',', array_fill(0, count($ids_array), '?'));
        $types = str_repeat('i', count($ids_array));

        // Adjust selected columns to match what createPropertyCardElement needs
        $sql = "SELECT p.id, p.title, p.location, p.price, p.currency, p.price_suffix, 
                       p.image_url_1 AS imageURL, p.bedrooms, p.bathrooms, p.area, p.tag
                FROM properties p
                WHERE p.id IN ($placeholders)";
        
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param($types, ...$ids_array);
            $stmt->execute();
            $result = $stmt->get_result();
            while($row = $result->fetch_assoc()) {
                // Cast types for consistent JSON
                $row['id'] = (int)$row['id'];
                $row['price'] = isset($row['price']) ? (float)$row['price'] : null;
                // ... other casts as needed ...
                $properties[] = $row;
            }
            $stmt->close();
        } else {
            http_response_code(500);
            error_log("Get Properties by IDs DB Error: " . $conn->error);
            echo json_encode(["success" => false, "error" => "Database query error."]);
            $conn->close();
            exit();
        }
    }
} // else if empty idsParam, it will return empty $properties array, which is fine

$conn->close();
echo json_encode($properties);
?>