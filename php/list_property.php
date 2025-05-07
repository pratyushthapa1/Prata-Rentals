<?php
session_start();
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$response = ["success" => false, "message" => "An error occurred."];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SESSION['user_id'])) {
    $user_id = (int)$_SESSION['user_id'];

    // --- Get Text Data (Sanitize!) ---
    $title = isset($_POST['title']) ? trim(htmlspecialchars($_POST['title'])) : null;
    $description = isset($_POST['description']) ? trim(htmlspecialchars($_POST['description'])) : null;
    $location = isset($_POST['location']) ? trim(htmlspecialchars($_POST['location'])) : null;
    $category = isset($_POST['category']) ? trim(htmlspecialchars($_POST['category'])) : null;
    $price = isset($_POST['price']) ? (float)$_POST['price'] : null;
    $currency = isset($_POST['currency']) ? trim(htmlspecialchars($_POST['currency'])) : 'NPR';
    $price_suffix = isset($_POST['price_suffix']) ? trim(htmlspecialchars($_POST['price_suffix'])) : '/mo';
    $bedrooms = isset($_POST['bedrooms']) ? (int)$_POST['bedrooms'] : null;
    $bathrooms = isset($_POST['bathrooms']) ? (int)$_POST['bathrooms'] : null;
    $area = isset($_POST['area']) ? (float)$_POST['area'] : null;
    $tag = isset($_POST['tag']) ? trim(htmlspecialchars($_POST['tag'])) : null;
    // Get features_array and map_image_url if your form sends them
    $features_json_string = isset($_POST['features_array_json']) ? $_POST['features_array_json'] : null; // Expecting a JSON string
    $map_image_url = isset($_POST['map_image_url']) ? trim(htmlspecialchars($_POST['map_image_url'])) : null;


    if (empty($title) || empty($location) || $price === null || empty($category)) {
        $response['message'] = "Title, location, price, and category are required.";
        http_response_code(400);
        echo json_encode($response);
        exit();
    }

    // --- Handle File Uploads ---
    $uploaded_image_paths_for_db = []; // Store web-accessible paths
    $main_image_url_for_db = null;
    $other_images_json_for_db = null;

    // Relative path from htdocs to your uploads folder for web access
    // Example: if project is in htdocs/prata-rentals, and uploads is htdocs/prata-rentals/uploads
    $web_upload_path_prefix = "uploads/properties/"; // ADJUST IF YOUR PROJECT IS IN A SUBFOLDER OF htdocs
    // Physical path on the server for move_uploaded_file
    $physical_upload_directory = __DIR__ . "/../uploads/properties/"; // Assumes 'api' and 'uploads' are siblings

    if (!file_exists($physical_upload_directory)) {
        if (!mkdir($physical_upload_directory, 0775, true)) {
            $response['message'] = "Failed to create upload directory.";
            http_response_code(500);
            error_log("Failed to create directory: " . $physical_upload_directory);
            echo json_encode($response);
            exit();
        }
    }

    if (isset($_FILES['property_images'])) {
        $files = $_FILES['property_images'];
        $num_files = is_array($files['name']) ? count($files['name']) : ($files['name'] ? 1 : 0);

        if ($num_files > 0) {
            $file_keys = is_array($files['name']) ? array_keys($files['name']) : [0];

            foreach ($file_keys as $key) {
                $file_error = is_array($files['error']) ? $files['error'][$key] : $files['error'];
                if ($file_error === UPLOAD_ERR_OK) {
                    $tmp_name = is_array($files['tmp_name']) ? $files['tmp_name'][$key] : $files['tmp_name'];
                    $original_filename = basename(is_array($files['name']) ? $files['name'][$key] : $files['name']);
                    $file_extension = strtolower(pathinfo($original_filename, PATHINFO_EXTENSION));
                    $safe_filename_base = preg_replace("/[^a-zA-Z0-9_-]/", "_", pathinfo($original_filename, PATHINFO_FILENAME));
                    $unique_filename = time() . "_" . uniqid() . "_" . $safe_filename_base . "." . $file_extension;
                    $destination = $physical_upload_directory . $unique_filename;

                    $allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                    $max_file_size = 5 * 1024 * 1024; // 5 MB
                    $file_size = is_array($files['size']) ? $files['size'][$key] : $files['size'];

                    if (!in_array($file_extension, $allowed_types)) { $response['message'] .= "Invalid file type: $original_filename. "; continue; }
                    if ($file_size > $max_file_size) { $response['message'] .= "File too large: $original_filename. "; continue; }

                    if (move_uploaded_file($tmp_name, $destination)) {
                        $uploaded_image_paths_for_db[] = $web_upload_path_prefix . $unique_filename;
                    } else { $response['message'] .= "Failed to move $original_filename. "; }
                } else if ($file_error !== UPLOAD_ERR_NO_FILE) {
                    $response['message'] .= "Error uploading $original_filename (Code: $file_error). ";
                }
            }
        }
    }

    if (!empty($uploaded_image_paths_for_db)) {
        $main_image_url_for_db = $uploaded_image_paths_for_db[0];
        if (count($uploaded_image_paths_for_db) > 1) {
            $other_images_json_for_db = json_encode(array_slice($uploaded_image_paths_for_db, 1));
        }
    }

    // Decode features_array if it's a JSON string from the form
    $features_array_for_db = null;
    if (!empty($features_json_string)) {
        $decoded_features = json_decode($features_json_string, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded_features)) {
            $features_array_for_db = json_encode($decoded_features); // Re-encode to ensure it's valid JSON for DB
        } else {
            // Treat as comma-separated string if not valid JSON
             $features_array_for_db = json_encode(array_map(function($f) { return ['text' => trim($f)]; }, explode(',', $features_json_string)));
        }
    }


    // --- Insert into Database ---
    $stmt = $conn->prepare("INSERT INTO properties 
        (user_id, title, description, location, category, price, currency, price_suffix, 
         bedrooms, bathrooms, area, image_url_1, image_urls_array, features_array, map_image_url, tag) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    if ($stmt) {
        // Bind parameters (ensure types match your table schema)
        // issssdssiids sss
        $stmt->bind_param("issssdssiidsisss", // Added type for features_array (s) and map_image_url (s)
            $user_id, $title, $description, $location, $category, $price, $currency, $price_suffix,
            $bedrooms, $bathrooms, $area, $main_image_url_for_db, $other_images_json_for_db,
            $features_array_for_db, $map_image_url, $tag
        );

        if ($stmt->execute()) {
            $response = ["success" => true, "message" => "Property listed successfully!", "property_id" => $stmt->insert_id];
        } else {
            $response['message'] = "Database insert error: " . $stmt->error;
            error_log("List Property DB Insert Error: " . $stmt->error);
            http_response_code(500);
        }
        $stmt->close();
    } else {
        $response['message'] = "Database prepare error: " . $conn->error;
        error_log("List Property DB Prepare Error: " . $conn->error);
        http_response_code(500);
    }

} else if (!isset($_SESSION['user_id'])) {
    $response['message'] = "User not authenticated.";
    http_response_code(401);
} else {
    $response['message'] = "Invalid request method.";
    http_response_code(405);
}

$conn->close();
echo json_encode($response);
?>