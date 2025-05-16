<?php
header("Access-Control-Allow-Origin: http://localhost:8000"); // Or your frontend URL
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once 'db_connect.php'; // Ensure this path is correct and $conn is established
header('Content-Type: text/plain'); // Output as plain text for this script

ini_set('display_errors', 1);
error_reporting(E_ALL);

// IMPORTANT: Change this to an existing user_id in your 'users' table
// or implement logic to determine/create user_id.
define('DEFAULT_USER_ID', 1);

// Ensure this path is correct. Using __DIR__ makes it relative to the script's directory.
$jsonFilePath = __DIR__ . '/../properties.json'; // Assuming properties.json is one level up from api folder
// If properties.json is in the same directory as this script:
// $jsonFilePath = __DIR__ . '/properties.json';
// Or use the absolute path you had, if it's reliable:
// $jsonFilePath = 'C:\xampp\htdocs\Prata\properties.json';


if (!file_exists($jsonFilePath)) {
    die("ERROR: JSON data file not found at: " . realpath($jsonFilePath) . " (tried: " . $jsonFilePath .")");
}

$jsonData = file_get_contents($jsonFilePath);
if ($jsonData === false) {
    die("ERROR: Could not read JSON data file.");
}

$properties = json_decode($jsonData, true); // true for associative array

if (json_last_error() !== JSON_ERROR_NONE) {
    die("ERROR: Invalid JSON format in data file: " . json_last_error_msg());
}

if (!is_array($properties)) {
    die("ERROR: JSON data did not decode into an array.");
}

echo "Starting property import...\n";
$importedCount = 0;
$skippedCount = 0;
$updatedCount = 0;
$noChangeCount = 0;


// Prepare statement for inserting/updating into properties table
// Match all columns from your SQL table definition
$sql = "INSERT INTO properties (
            id, user_id, title, description, location, category,
            price, currency, price_suffix, rental_type, short_term_options,
            bedrooms, bathrooms, area, total_floors, has_wifi,
            image_url_1, image_urls_array, features_array, amenities_array,
            map_image_url, google_maps_link, latitude, longitude, tag,
            created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            NOW(), NOW()
        ) ON DUPLICATE KEY UPDATE
            user_id=VALUES(user_id), title=VALUES(title), description=VALUES(description),
            location=VALUES(location), category=VALUES(category), price=VALUES(price),
            currency=VALUES(currency), price_suffix=VALUES(price_suffix), rental_type=VALUES(rental_type),
            short_term_options=VALUES(short_term_options), bedrooms=VALUES(bedrooms), bathrooms=VALUES(bathrooms),
            area=VALUES(area), total_floors=VALUES(total_floors), has_wifi=VALUES(has_wifi),
            image_url_1=VALUES(image_url_1), image_urls_array=VALUES(image_urls_array),
            features_array=VALUES(features_array), amenities_array=VALUES(amenities_array),
            map_image_url=VALUES(map_image_url), google_maps_link=VALUES(google_maps_link),
            latitude=VALUES(latitude), longitude=VALUES(longitude), tag=VALUES(tag),
            updated_at=NOW()";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    die("ERROR: SQL Prepare failed: (" . $conn->errno . ") " . $conn->error);
}

// Define the types for bind_param. This MUST match the order and type of your placeholders.
// id(i), user_id(i), title(s), description(s), location(s), category(s),
// price(d), currency(s), price_suffix(s), rental_type(s), short_term_options(s-JSON),
// bedrooms(i), bathrooms(i), area(d), total_floors(i), has_wifi(i-boolean 0/1),
// image_url_1(s), image_urls_array(s-JSON), features_array(s-JSON), amenities_array(s-JSON),
// map_image_url(s), google_maps_link(s), latitude(d), longitude(d), tag(s)
// Total: 25 placeholders for values being inserted/updated (created_at, updated_at handled by NOW())
$bind_types = "iissssdsssidiiissssssddds";

foreach ($properties as $property) {
    // --- Data Preparation and Sanitization ---
    $id = isset($property['id']) ? (int)$property['id'] : null;
    if ($id === null) {
        echo "Skipping property with no ID: " . (isset($property['title']) ? $property['title'] : 'N/A') . "\n";
        $skippedCount++;
        continue;
    }

    $user_id_to_insert = DEFAULT_USER_ID;
    $title = isset($property['title']) ? trim($property['title']) : 'Untitled Property';
    $description = isset($property['description']) ? trim($property['description']) : null;
    $location = isset($property['location']) ? trim($property['location']) : null;
    $category = isset($property['type']) ? trim($property['type']) : null; // JSON 'type' maps to SQL 'category'

    $price = isset($property['price']) ? (float)str_replace(',', '', $property['price']) : null; // Remove commas for float conversion
    $currency = isset($property['currency']) ? trim($property['currency']) : 'NPR';
    $price_suffix = isset($property['priceSuffix']) ? trim($property['priceSuffix']) : '/mo';
    $rental_type = isset($property['rentalType']) ? trim($property['rentalType']) : null;

    // Handle JSON encoded fields
    $short_term_options_json = (isset($property['shortTermOptions']) && is_array($property['shortTermOptions'])) ? json_encode($property['shortTermOptions']) : (empty($property['shortTermOptions']) ? '[]' : null);

    $bedrooms = isset($property['bedrooms']) ? (int)$property['bedrooms'] : null;
    $bathrooms = isset($property['bathrooms']) ? (int)$property['bathrooms'] : null;
    $area = isset($property['area']) ? (float)str_replace(',', '', $property['area']) : null; // Remove commas
    
    // total_floors can come from 'total_floors' or 'numberOfFloors' for backward compatibility with your old JSON for id 9
    $total_floors_val = null;
    if (isset($property['total_floors'])) {
        $total_floors_val = (int)$property['total_floors'];
    } elseif (isset($property['numberOfFloors'])) { // For the original property ID 9 structure
        $total_floors_val = (int)$property['numberOfFloors'];
    }


    $has_wifi_val = null;
    if (isset($property['has_wifi'])) { // Directly from new JSON structure
        $has_wifi_val = $property['has_wifi'] ? 1 : 0;
    } elseif (isset($property['amenities']) && is_array($property['amenities'])) { // Check amenities from old structure
        $has_wifi_val = in_array('Wi-Fi', $property['amenities']) ? 1 : 0;
    } elseif (isset($property['hasWifi'])) { // from original property ID 9
         $has_wifi_val = $property['hasWifi'] ? 1 : 0;
    } else {
        $has_wifi_val = 0; // Default to false if not found
    }


    $image_url_1 = isset($property['image']) ? trim($property['image']) : null;
    $image_urls_array_json = (isset($property['gallery']) && is_array($property['gallery'])) ? json_encode($property['gallery']) : (empty($property['gallery']) ? '[]' : null);
    $features_array_json = (isset($property['features']) && is_array($property['features'])) ? json_encode($property['features']) : (empty($property['features']) ? '[]' : null);
    $amenities_array_json = (isset($property['amenities']) && is_array($property['amenities'])) ? json_encode($property['amenities']) : (empty($property['amenities']) ? '[]' : null);

    // map_image_url is often NULL in your SQL dump, default to NULL unless specified.
    // The original JSON for ID 9 had mapLink, others used derived google_maps_link.
    // The SQL table has both map_image_url and google_maps_link.
    $map_image_url_val = isset($property['map_image_url']) ? trim($property['map_image_url']) : null; // If JSON provides it directly
    
    $google_maps_link_val = null;
    if (isset($property['mapLink'])) { // From original ID 9 structure or new
        $google_maps_link_val = trim($property['mapLink']);
    } elseif (isset($property['google_maps_link'])) { // From SQL derived structure
        $google_maps_link_val = trim($property['google_maps_link']);
    }

    $latitude_val = null;
    $longitude_val = null;
    if (isset($property['latitude']) && isset($property['longitude'])) {
        $latitude_val = (float)$property['latitude'];
        $longitude_val = (float)$property['longitude'];
    } elseif (isset($property['coordinates']) && is_array($property['coordinates'])) {
        $latitude_val = isset($property['coordinates']['lat']) ? (float)$property['coordinates']['lat'] : null;
        $longitude_val = isset($property['coordinates']['lng']) ? (float)$property['coordinates']['lng'] : null;
    }
    
    $tag = isset($property['tag']) ? trim($property['tag']) : null;

    // Bind parameters
    $stmt->bind_param(
        $bind_types,
        $id, $user_id_to_insert, $title, $description, $location, $category,
        $price, $currency, $price_suffix, $rental_type, $short_term_options_json,
        $bedrooms, $bathrooms, $area, $total_floors_val, $has_wifi_val,
        $image_url_1, $image_urls_array_json, $features_array_json, $amenities_array_json,
        $map_image_url_val, $google_maps_link_val, $latitude_val, $longitude_val, $tag
    );

    if ($stmt->execute()) {
        if ($stmt->affected_rows === 1 && $stmt->insert_id == $id) { // Check if it was an insert
            echo "Successfully INSERTED property ID: " . $id . " - " . $title . "\n";
            $importedCount++;
        } elseif ($stmt->affected_rows === 1 || $stmt->affected_rows === 2) { // 2 for update, 1 if update didn't change data but was matched
             echo "Successfully UPDATED property ID: " . $id . " - " . $title . "\n";
             $updatedCount++;
        } elseif ($stmt->affected_rows === 0) {
            echo "No changes for property ID: " . $id . " (data matched existing record)\n";
            $noChangeCount++;
        } else {
            // This case might not be hit often with ON DUPLICATE KEY UPDATE if it always affects rows.
            echo "Executed for property ID: " . $id . " - " . $title . " (Affected rows: " . $stmt->affected_rows . ")\n";
        }
    } else {
        echo "ERROR processing property ID " . $id . " (" . $title . "): (" . $stmt->errno . ") " . $stmt->error . "\n";
        $skippedCount++;
    }
}

$stmt->close();
$conn->close();

echo "\nImport complete.\n";
echo "Successfully INSERTED: " . $importedCount . " properties.\n";
echo "Successfully UPDATED: " . $updatedCount . " properties.\n";
echo "No changes (data matched): " . $noChangeCount . " properties.\n";
echo "Skipped (due to error or no ID): " . $skippedCount . " properties.\n";

?>