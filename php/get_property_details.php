<?php
// Ensure db_connect.php defines $conn or dies with an error.
require_once __DIR__ . '/db_connect.php'; // $conn should be established here

// --- CORS Headers ---
// Consider getting $allowed_origin from an environment variable for flexibility
// Example: $allowed_origin = getenv('ALLOWED_CORS_ORIGIN') ?: "http://localhost:8000";
$allowed_origin = "http://localhost:8000";

if (isset($_SERVER['HTTP_ORIGIN'])) {
    if ($_SERVER['HTTP_ORIGIN'] === $allowed_origin) {
        header("Access-Control-Allow-Origin: " . $allowed_origin);
    } else {
        // If origin is present but not allowed, you might choose to send a 403 Forbidden response.
        // Omitting the ACAO header will also cause the browser to block the request (CORS error).
        // For development, you might temporarily use:
        // header("Access-Control-Allow-Origin: *"); // Be cautious with wildcard in production
    }
}
// For requests without an Origin header (e.g. same-origin navigations, server-to-server), no ACAO header is sent or needed.

header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Adjust if only GET is used for this endpoint
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Add any other custom headers your client sends
header("Access-Control-Allow-Credentials: true"); // Needed if client sends cookies or auth headers with `fetch`

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); // Preflight request acknowledged
    exit();
}

function send_json_response($data, $statusCode = 200) {
    global $conn; // $conn can be null if connection failed before this point
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    // Ensure $conn is a valid, open mysqli connection before trying to close
    if ($conn instanceof \mysqli && $conn->thread_id) { // Check if $conn is a valid mysqli object and connection is active
        $conn->close();
    }
    exit();
}

// Validate property ID
$property_id_input = isset($_GET['id']) ? $_GET['id'] : null;
$property_id = filter_var($property_id_input, FILTER_VALIDATE_INT);

if ($property_id === false || $property_id <= 0) { // filter_var returns false on failure, check for <=0 as well
    send_json_response(["success" => false, "message" => "Invalid property ID provided. Must be a positive integer."], 400);
}

// Check database connection
if (!($conn instanceof \mysqli) || $conn->connect_error) {
    $error_message = "Database connection failed in get_property_details.php";
    if ($conn instanceof \mysqli && $conn->connect_error) { // Check if $conn is mysqli object before accessing connect_error
        $error_message .= ": " . $conn->connect_error;
    } elseif (!($conn instanceof \mysqli)) {
        $error_message .= ": \$conn is not a valid mysqli object (check db_connect.php).";
    }
    error_log($error_message);
    send_json_response(["success" => false, "message" => "Internal server error: Database connection problem."], 500);
}

// Prepare SQL statement
$sql = "SELECT p.*, u.username AS owner_username, u.email AS owner_email
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.id = ?";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    error_log("Get Property Details - DB Prepare Error: " . $conn->error);
    send_json_response(["success" => false, "message" => "Database query preparation error."], 500);
}

// Bind parameters
if (!$stmt->bind_param("i", $property_id)) {
    error_log("Get Property Details - DB Bind Param Error: " . $stmt->error);
    $stmt->close(); // Close statement if bind fails after prepare succeeded
    send_json_response(["success" => false, "message" => "Database query parameter binding error."], 500);
}

// Execute statement
if (!$stmt->execute()) {
    error_log("Get Property Details - DB Execute Error: " . $stmt->error);
    $stmt->close(); // Close statement
    send_json_response(["success" => false, "message" => "Database query execution error."], 500);
}

// Get result
$result = $stmt->get_result();
if (!$result) {
    error_log("Get Property Details - DB Get Result Error: " . $stmt->error);
    $stmt->close(); // Close statement
    send_json_response(["success" => false, "message" => "Database query result retrieval error."], 500);
}

// Process result
if ($result->num_rows === 1) {
    $property = $result->fetch_assoc();
    $stmt->close(); // Close statement as soon as data is fetched and no longer needed

    // --- Start Data Transformation ---

    // 1. Type casting for numeric fields (int)
    // Preserves NULL if DB field is NULL, otherwise casts to int.
    $int_keys = ['id', 'user_id', 'bedrooms', 'bathrooms', 'year_built', 'total_floors', 'floor_no', 'kitchens', 'living_rooms'];
    foreach ($int_keys as $key) {
        if (isset($property[$key]) && $property[$key] !== null) { // isset returns false for nulls
            $property[$key] = (int)$property[$key];
        }
    }

    // 2. Type casting for numeric fields (float)
    // Preserves NULL if DB field is NULL, otherwise casts to float.
    $float_keys = ['price', 'area', 'latitude', 'longitude', 'road_access_ft'];
    foreach ($float_keys as $key) {
        if (isset($property[$key]) && $property[$key] !== null) {
            $property[$key] = (float)$property[$key];
        }
    }

    // 3. Type casting for boolean fields
    // Assumes boolean fields in DB are TINYINT(1) (0 for false, non-zero for true).
    // If DB field is NULL, (bool)NULL becomes false.
    $bool_keys = ['is_available', 'is_featured', 'has_parking', 'is_furnished', 'parking_available', 'hasWifi'];
    foreach ($bool_keys as $key) {
        if (array_key_exists($key, $property)) { // array_key_exists is true even for null values
            $property[$key] = (bool)$property[$key];
        }
    }

    // 4. Decode JSON string fields from DB into PHP arrays and map/rename keys for JS
    $json_field_map = [
        'image_urls_array' => 'gallery',   // DB: image_urls_array (JSON string) -> JS: gallery (array)
        'features_array'   => 'features',  // DB: features_array (JSON string) -> JS: features (array)
        'amenities_array'  => 'amenities', // DB: amenities_array (JSON string) -> JS: amenities (array)
    ];

    foreach ($json_field_map as $db_column_name => $js_key_name) {
        $decoded_value = []; // Default to empty array for the JS key

        if (array_key_exists($db_column_name, $property) && $property[$db_column_name] !== null) {
            if (is_string($property[$db_column_name]) && trim($property[$db_column_name]) !== '') {
                $decoded = json_decode($property[$db_column_name], true); // true for associative array
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $decoded_value = $decoded;
                } else {
                    // Log error for malformed JSON if necessary, helps debug data issues
                    error_log("Get Property Details - JSON Decode Error for property ID {$property_id}, column '{$db_column_name}': " . json_last_error_msg() . ". Original value: " . $property[$db_column_name]);
                }
            } elseif (is_array($property[$db_column_name])) {
                // This case is unlikely if DB column is TEXT/VARCHAR storing JSON string,
                // but included for robustness if data somehow is already an array.
                $decoded_value = $property[$db_column_name];
            }
            // If $property[$db_column_name] was NULL, an empty string, or not a decodable JSON string,
            // $decoded_value remains the default empty array [].
        }
        $property[$js_key_name] = $decoded_value;

        // Remove the original DB column key if it's different from the JS key to avoid redundancy in output
        if ($db_column_name !== $js_key_name && array_key_exists($db_column_name, $property)) {
            unset($property[$db_column_name]);
        }
    }
    
    // 5. Ensure all other expected keys by JavaScript exist in the final $property array.
    // This helps prevent 'undefined' errors in JavaScript consuming this API.
    // List all keys your JavaScript frontend expects on the property object.
    $all_expected_js_keys = [
        // Numeric keys (already processed by type casting if present in DB result)
        'id', 'user_id', 'bedrooms', 'bathrooms', 'year_built', 'total_floors', 'floor_no', 'kitchens', 'living_rooms',
        'price', 'area', 'latitude', 'longitude', 'road_access_ft',
        // Boolean keys (already processed by type casting if present in DB result)
        'is_available', 'is_featured', 'has_parking', 'is_furnished', 'parking_available', 'hasWifi',
        // Array keys (from json_field_map values, should already be arrays)
        'gallery', 'features', 'amenities',
        // Other string/mixed type keys expected by frontend (add any not covered above)
        'area_unit', 'location', 'address', 'location_text',
        'priceSuffix', 'price_suffix', // If 'price_suffix' is DB col and 'priceSuffix' is desired JS key,
                                       // consider explicit renaming logic above or ensure JS handles 'price_suffix'.
        'currency', 'type', 'description',
        'furnished_status', 'parking_details', 'facing_direction',
        'google_maps_link', 'map_image_url', 'coordinates', 'mapLink',
        'owner_username', 'owner_email' // From JOIN in SQL
    ];
    
    $all_expected_js_keys = array_unique($all_expected_js_keys); // Ensure no duplicates in our list

    foreach ($all_expected_js_keys as $key_to_ensure) {
        if (!array_key_exists($key_to_ensure, $property)) {
            // If a key that is expected to be an array is missing, default it to an empty array.
            // (gallery, features, amenities should already be handled by json_field_map logic)
            if (in_array($key_to_ensure, ['gallery', 'features', 'amenities'])) {
                $property[$key_to_ensure] = [];
            } else {
                // For all other missing keys, default to null.
                $property[$key_to_ensure] = null;
            }
        }
    }
    // --- End Data Transformation ---

    send_json_response(['success' => true, 'property' => $property]);

} else { // Property not found ( $result->num_rows === 0 )
    $stmt->close(); // Close statement
    send_json_response(["success" => false, "message" => "Property with ID {$property_id} not found."], 404);
}
?>