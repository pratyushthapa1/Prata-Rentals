<?php
// api/get_featured_properties.php
require_once __DIR__ . '/db_connect.php';
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Handle preflight request for CORS
    http_response_code(200);
    exit();
}

$properties = [];

// Select all columns from properties (p) that are useful for a card display
// and the username from the users (u) table.
// Ensure the aliases match what your JavaScript's createPropertyCardElement expects.
$sql = "SELECT 
            p.id, 
            p.user_id, 
            p.title, 
            p.location, 
            p.category,
            p.price, 
            p.currency, 
            p.price_suffix, 
            p.image_url_1 AS imageURL,  -- Aliasing image_url_1 to imageURL if JS expects that
            p.bedrooms, 
            p.bathrooms, 
            p.area, 
            p.tag,
            p.created_at, 
            u.username AS owner_username -- Get the owner's username
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id  -- LEFT JOIN in case a property's user_id is somehow invalid or user deleted
        WHERE p.tag IN ('Featured', 'Popular') -- Filter for featured/popular properties
        ORDER BY p.created_at DESC             -- Show newest first
        LIMIT 8";                            

$result = $conn->query($sql);

if ($result) {
    while($row = $result->fetch_assoc()) {
        // --- Data Type Casting for JSON Correctness ---
        $row['id'] = (int)$row['id'];
        $row['user_id'] = isset($row['user_id']) ? (int)$row['user_id'] : null; // user_id can be null if LEFT JOIN fails
        
        // Price and Area should be numbers (float for decimals)
        $row['price'] = isset($row['price']) ? (float)$row['price'] : null;
        $row['area'] = isset($row['area']) ? (float)$row['area'] : null;
        
        // Bedrooms and Bathrooms should be integers
        $row['bedrooms'] = isset($row['bedrooms']) ? (int)$row['bedrooms'] : null;
        $row['bathrooms'] = isset($row['bathrooms']) ? (int)$row['bathrooms'] : null;

        // imageURL is already aliased if 'image_url_1' was selected
        // 'owner_username' is already selected

        // No need to decode JSON arrays (image_urls_array, features_array) for the card view,
        // unless your createPropertyCardElement needs more than the first image or specific features.
        // If you did need them, you'd add them to the SELECT and decode here:
        // $row['image_urls_array'] = (!empty($row['image_urls_array']) && is_string($row['image_urls_array'])) ? json_decode($row['image_urls_array'], true) : [];
        // $row['features_array'] = (!empty($row['features_array']) && is_string($row['features_array'])) ? json_decode($row['features_array'], true) : [];

        $properties[] = $row;
    }
    $result->free(); // Free the result set
} else {
    // If the query fails, send a server error response
    http_response_code(500); // Internal Server Error
    error_log("Get Featured Properties DB Error: " . $conn->error . " SQL: " . $sql); // Log the detailed error
    echo json_encode(["success" => false, "error" => "Failed to fetch properties. Please try again later."]);
    $conn->close();
    exit(); // Stop script execution
}

$conn->close(); // Close the database connection

// Send the properties array as a JSON response
echo json_encode($properties);
?>