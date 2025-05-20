<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once __DIR__ . '/db_connect.php';

$response = ["success" => false, "properties" => [], "message" => ""];

$sql = "SELECT id, title, category, location, price, price_suffix, currency, image_url_1, image_urls_array, tag, features_array, description, map_image_url, bedrooms, bathrooms, area, created_at, updated_at FROM properties";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $properties = [];
    while ($row = $result->fetch_assoc()) {
        // Decode JSON fields if stored as JSON in DB
        if (isset($row['features_array'])) {
            $row['features_array'] = json_decode($row['features_array'], true);
        }
        if (isset($row['image_urls_array'])) {
            $row['image_urls_array'] = json_decode($row['image_urls_array'], true);
        }
        $properties[] = $row;
    }
    $response['success'] = true;
    $response['properties'] = $properties;
} else {
    $response['message'] = 'No properties found.';
}

$conn->close();
echo json_encode($response);
?>