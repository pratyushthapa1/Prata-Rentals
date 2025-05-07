<?php
header('Content-Type: application/json');
error_reporting(0); // Hide warnings/notices in production
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
require_once __DIR__ . '/db_connect.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$properties = [];
$sql_conditions = [];
$bind_params_values = []; // Store values for bind_param
$bind_params_types = "";    // Store types for bind_param

$sql = "SELECT p.id, p.user_id, p.title, p.location, p.category, p.price, p.currency, p.price_suffix, 
               p.image_url_1 AS imageURL, p.bedrooms, p.bathrooms, p.area, p.tag, u.username AS owner_username
        FROM properties p
        JOIN users u ON p.user_id = u.id
        WHERE 1=1"; // Start with a true condition

// Sanitize and build query based on GET parameters
$location = isset($_GET['location']) ? trim(htmlspecialchars($_GET['location'])) : null;
if (!empty($location)) {
    $sql_conditions[] = "p.location LIKE ?";
    $bind_params_values[] = "%" . $location . "%";
    $bind_params_types .= "s";
}

$category = isset($_GET['category']) ? trim(htmlspecialchars($_GET['category'])) : null;
if (!empty($category)) {
    $sql_conditions[] = "p.category = ?";
    $bind_params_values[] = $category;
    $bind_params_types .= "s";
}

$max_price = isset($_GET['max_price']) ? (float)$_GET['max_price'] : null;
if ($max_price !== null && $max_price > 0) {
    $sql_conditions[] = "p.price <= ?";
    $bind_params_values[] = $max_price;
    $bind_params_types .= "d";
}
// Add more filters: bedrooms, bathrooms, min_price etc.
// Example for bedrooms:
// $bedrooms = isset($_GET['bedrooms']) ? (int)$_GET['bedrooms'] : null;
// if ($bedrooms !== null && $bedrooms > 0) {
//     $sql_conditions[] = "p.bedrooms >= ?";
//     $bind_params_values[] = $bedrooms;
//     $bind_params_types .= "i";
// }

if (!empty($sql_conditions)) {
    $sql .= " AND " . implode(" AND ", $sql_conditions);
}

$sql .= " ORDER BY p.created_at DESC LIMIT 20"; // Add pagination later

$stmt = $conn->prepare($sql);

if ($stmt) {
    // Dynamically bind parameters if there are any
    if (!empty($bind_params_types) && count($bind_params_values) > 0) {
        // The splat operator (...) unpacks the array into individual arguments
        $stmt->bind_param($bind_params_types, ...$bind_params_values);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    while($row = $result->fetch_assoc()) {
        // Cast numeric types
        $row['id'] = (int)$row['id'];
        $row['user_id'] = (int)$row['user_id'];
        $row['price'] = isset($row['price']) ? (float)$row['price'] : null;
        $row['bedrooms'] = isset($row['bedrooms']) ? (int)$row['bedrooms'] : null;
        $row['bathrooms'] = isset($row['bathrooms']) ? (int)$row['bathrooms'] : null;
        $row['area'] = isset($row['area']) ? (float)$row['area'] : null;
        $properties[] = $row;
    }
    $stmt->close();
} else {
    http_response_code(500);
    error_log("Search Properties DB Error: " . $conn->error . " SQL: " . $sql);
    echo json_encode(["error" => "Search query failed."]);
    $conn->close();
    exit();
}

$conn->close();
echo json_encode($properties);
?>