<?php
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
// api/import_properties.php
require_once 'db_connect.php'; // For $conn
header('Content-Type: text/plain'); // Output as plain text for this script

ini_set('display_errors', 1);
error_reporting(E_ALL);

define('DEFAULT_USER_ID', 1); // IMPORTANT: Change this to an existing user_id in your 'users' table

$jsonFilePath = __DIR__ . '/properties.json'; // Assumes JSON file is in the same directory

if (!file_exists($jsonFilePath)) {
    die("ERROR: JSON data file not found at: " . $jsonFilePath);
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

// Prepare statement for inserting into properties table
// Adjust columns based on your 'properties' table structure exactly
$sql = "INSERT INTO properties (
            id, user_id, title, description, location, category, 
            price, currency, price_suffix, bedrooms, bathrooms, area, 
            image_url_1, image_urls_array, features_array, map_image_url, 
            tag, created_at 
            -- Add numberOfFloors, floorNumber, hasWifi if you added these columns
            -- For example: , numberOfFloors, floorNumber, hasWifi
        ) VALUES (
            ?, ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, 
            ? , NOW() 
            -- , ?, ?, ? -- Corresponding placeholders for numberOfFloors, etc.
        ) ON DUPLICATE KEY UPDATE 
            user_id=VALUES(user_id), title=VALUES(title), description=VALUES(description), location=VALUES(location), category=VALUES(category),
            price=VALUES(price), currency=VALUES(currency), price_suffix=VALUES(price_suffix), bedrooms=VALUES(bedrooms), bathrooms=VALUES(bathrooms), area=VALUES(area),
            image_url_1=VALUES(image_url_1), image_urls_array=VALUES(image_urls_array), features_array=VALUES(features_array), map_image_url=VALUES(map_image_url),
            tag=VALUES(tag), updated_at=NOW() 
            -- , numberOfFloors=VALUES(numberOfFloors), floorNumber=VALUES(floorNumber), hasWifi=VALUES(hasWifi) -- Update these too
            ";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    die("ERROR: SQL Prepare failed: (" . $conn->errno . ") " . $conn->error);
}

// Define the types for bind_param. This MUST match the order and type of your placeholders.
// Example: "iissssdssiidsisss" -> 17 placeholders
// id(i), user_id(i), title(s), description(s), location(s), category(s),
// price(d), currency(s), price_suffix(s), bedrooms(i), bathrooms(i), area(d),
// image_url_1(s), image_urls_array(s-TEXT), features_array(s-TEXT), map_image_url(s),
// tag(s)
// The types are: i (integer), d (double/decimal), s (string), b (blob)
$bind_types = "iissssdssiidsisss"; // Adjust if you add numberOfFloors, floorNumber, hasWifi
                                  // For example, if numberOfFloors(i), floorNumber(i), hasWifi(i -> 0 or 1)
                                  // then it would be: "iissssdssiidsisssiii"

foreach ($properties as $property) {
    // --- Data Preparation and Sanitization ---
    $id = isset($property['id']) ? (int)$property['id'] : null;
    $user_id_to_insert = DEFAULT_USER_ID; // Assign to default user
    $title = isset($property['title']) ? trim($property['title']) : 'Untitled Property';
    $description = isset($property['description']) ? trim($property['description']) : null;
    $location = isset($property['location']) ? trim($property['location']) : null;
    $category = isset($property['type']) ? trim($property['type']) : null; // JSON uses 'type'
    
    $price = isset($property['price']) ? (float)$property['price'] : null;
    $currency = isset($property['currency']) ? trim($property['currency']) : 'NPR';
    $price_suffix = isset($property['priceSuffix']) ? trim($property['priceSuffix']) : '/mo';
    
    $bedrooms = isset($property['features']) ? null : null; // Extract from features or direct
    $bathrooms = isset($property['features']) ? null : null;
    $area = isset($property['features']) ? null : null;

    // Extract bedrooms, bathrooms, area from features array if they exist there
    if (isset($property['features']) && is_array($property['features'])) {
        foreach ($property['features'] as $feature) {
            if (isset($feature['text'])) {
                if (stripos($feature['text'], 'bedroom') !== false) {
                    preg_match('/(\d+)/', $feature['text'], $matches);
                    if (isset($matches[1])) $bedrooms = (int)$matches[1];
                }
                if (stripos($feature['text'], 'bathroom') !== false) {
                    preg_match('/(\d+)/', $feature['text'], $matches);
                    if (isset($matches[1])) $bathrooms = (int)$matches[1];
                }
                if (stripos($feature['text'], 'sq ft') !== false || stripos($feature['text'], 'sqft') !== false) {
                    preg_match('/([\d\.]+)/', $feature['text'], $matches);
                    if (isset($matches[1])) $area = (float)$matches[1];
                }
            }
        }
    }
    
    $image_url_1 = isset($property['image']) ? trim($property['image']) : null;
    // Store arrays as JSON strings for TEXT columns in MySQL
    $image_urls_array_json = isset($property['gallery']) && is_array($property['gallery']) ? json_encode($property['gallery']) : null;
    $features_array_json = isset($property['features']) && is_array($property['features']) ? json_encode($property['features']) : null;
    
    $map_image_url = isset($property['mapLink']) && !empty($property['mapLink']) ? 'images/basemap-image-2.png' : null; // Example: if mapLink exists, use a generic map image. Or store mapLink directly if your table has a column for it.
    // If your table has a `map_link` column:
    // $map_link_db = isset($property['mapLink']) ? trim($property['mapLink']) : null;
    // And coordinates:
    // $coordinates_json = isset($property['coordinates']) && is_array($property['coordinates']) ? json_encode($property['coordinates']) : null;


    $tag = isset($property['tag']) ? trim($property['tag']) : null;

    // --- Additional fields from JSON not in the original minimal schema ---
    // $numberOfFloors = isset($property['numberOfFloors']) ? (int)$property['numberOfFloors'] : null;
    // $floorNumber = isset($property['floorNumber']) ? (int)$property['floorNumber'] : null;
    // $hasWifi = isset($property['hasWifi']) ? ($property['hasWifi'] ? 1 : 0) : null; // Convert boolean to 0/1 for INT

    if ($id === null) {
        echo "Skipping property with no ID: " . $title . "\n";
        $skippedCount++;
        continue;
    }

    // Bind parameters
    // The number of variables here MUST match the number of ? in SQL and types in $bind_types
    $stmt->bind_param(
        $bind_types,
        $id, $user_id_to_insert, $title, $description, $location, $category,
        $price, $currency, $price_suffix, $bedrooms, $bathrooms, $area,
        $image_url_1, $image_urls_array_json, $features_array_json, $map_image_url, // $map_link_db if you use that
        $tag
        // , $numberOfFloors, $floorNumber, $hasWifi // Add if you included these in SQL and $bind_types
    );

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo "Successfully inserted/updated property ID: " . $id . " - " . $title . "\n";
            $importedCount++;
        } else {
            echo "No changes for property ID: " . $id . " (might be a duplicate with no differing values for ON DUPLICATE KEY UPDATE)\n";
        }
    } else {
        echo "ERROR inserting/updating property ID " . $id . " (" . $title . "): (" . $stmt->errno . ") " . $stmt->error . "\n";
        $skippedCount++;
    }
}

$stmt->close();
$conn->close();

echo "\nImport complete.\n";
echo "Successfully imported/updated: " . $importedCount . " properties.\n";
echo "Skipped: " . $skippedCount . " properties.\n";

?>