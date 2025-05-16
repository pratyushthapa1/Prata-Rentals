<?php
header('Content-Type: application/json');
// Consider restricting this in production:
// header('Access-Control-Allow-Origin: http://localhost:8000'); // Example
header('Access-Control-Allow-Origin: *'); // For development, be cautious in production
require_once __DIR__ . '/db_connect.php'; // Ensure this path is correct

$response = ["success" => false, "properties" => [], "message" => ""];

// Select all columns from your table structure that are relevant for the listing
// I've included all columns from your screenshot. Adjust if you need fewer.
$sql = "SELECT
            id,
            user_id,
            title,
            description,
            location,
            category,
            price,
            currency,
            price_suffix,
            rental_type,
            short_term_options,
            bedrooms,
            bathrooms,
            area,
            total_floors,
            has_wifi,
            image_url_1,
            image_urls_array,
            features_array,
            amenities_array,
            map_image_url,
            google_maps_link,
            latitude,
            longitude,
            tag,
            created_at,
            updated_at
        FROM properties";

$result = $conn->query($sql);

if (!$result) {
    // Query failed
    $response['message'] = 'Database query failed: ' . $conn->error;
    error_log('Get All Properties - DB Query Error: ' . $conn->error);
    echo json_encode($response);
    $conn->close();
    exit;
}

if ($result->num_rows > 0) {
    $properties_data = [];
    while ($row = $result->fetch_assoc()) {
        // Create an alias for the main image, consistent with single property view
        if (isset($row['image_url_1'])) {
            $row['imageURL'] = $row['image_url_1'];
        } else {
            $row['imageURL'] = null; // Or a placeholder image path
        }

        // Decode JSON string fields into arrays
        // DB column name => JS friendly key (or keep same if you prefer)
        $json_fields_from_db = [
            'features_array'     => 'features',
            'amenities_array'    => 'amenities',
            'image_urls_array'   => 'image_urls_array', // Or 'galleryImages'
            'short_term_options' => 'short_term_options' // This is also a JSON string in your table
        ];

        foreach ($json_fields_from_db as $db_key => $js_key) {
            if (isset($row[$db_key]) && is_string($row[$db_key])) {
                $decoded = json_decode($row[$db_key], true);
                // Assign decoded array if JSON is valid and is an array, otherwise assign an empty array
                $row[$js_key] = (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) ? $decoded : [];
                if ($db_key !== $js_key) { // Remove original DB key if we renamed it for JS
                    unset($row[$db_key]);
                }
            } elseif (isset($row[$db_key]) && is_array($row[$db_key])) {
                // If it's somehow already an array (less common with standard mysqli fetch_assoc)
                $row[$js_key] = $row[$db_key];
                 if ($db_key !== $js_key) {
                    unset($row[$db_key]);
                }
            } else {
                // If DB key not set or not a string, ensure JS key is an empty array
                $row[$js_key] = [];
            }
        }

        // Basic type casting for consistency
        if (isset($row['id'])) $row['id'] = (int)$row['id'];
        if (isset($row['user_id'])) $row['user_id'] = $row['user_id'] !== null ? (int)$row['user_id'] : null;
        if (isset($row['bedrooms'])) $row['bedrooms'] = $row['bedrooms'] !== null ? (int)$row['bedrooms'] : null;
        if (isset($row['bathrooms'])) $row['bathrooms'] = $row['bathrooms'] !== null ? (int)$row['bathrooms'] : null;
        if (isset($row['total_floors'])) $row['total_floors'] = $row['total_floors'] !== null ? (int)$row['total_floors'] : null;
        if (isset($row['has_wifi'])) $row['has_wifi'] = (bool)$row['has_wifi']; // tinyint(1) can be treated as boolean
        if (isset($row['area'])) $row['area'] = $row['area'] !== null ? (float)$row['area'] : null; // decimal(10,2)
        if (isset($row['price'])) $row['price'] = $row['price'] !== null ? (float)$row['price'] : null; // decimal(12,2)
        if (isset($row['latitude'])) $row['latitude'] = $row['latitude'] !== null ? (float)$row['latitude'] : null; // decimal(10,7)
        if (isset($row['longitude'])) $row['longitude'] = $row['longitude'] !== null ? (float)$row['longitude'] : null; // decimal(10,7)

        // Remove original db column names if you aliased them to JS friendly keys
        // This is already handled inside the foreach loop if ($db_key !== $js_key)

        $properties_data[] = $row;
    }
    $response['success'] = true;
    $response['properties'] = $properties_data;
} else {
    $response['message'] = 'No properties found.';
    // $response['success'] is already false by default, but you can set it explicitly if desired
    // $response['success'] = true; // No, this would be wrong here, means success but no properties
}

$conn->close();
echo json_encode($response);
?>