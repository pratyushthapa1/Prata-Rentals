<?php
// api/submit_inquiry.php
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$response = ["success" => false, "message" => "Invalid request method."];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Assuming JS sends FormData, access with $_POST
    // Ensure your JS sends 'propertyId' and 'propertyName' if they are part of the form
    $property_id = isset($_POST['propertyId']) ? (int)$_POST['propertyId'] : (isset($_POST['property_id']) ? (int)$_POST['property_id'] : 0);
    $property_name = isset($_POST['propertyName']) ? trim(htmlspecialchars($_POST['propertyName'])) : 'N/A';
    $name = isset($_POST['name']) ? trim(htmlspecialchars($_POST['name'])) : null;
    $email = isset($_POST['email']) ? trim($_POST['email']) : null;
    $message = isset($_POST['message']) ? trim(htmlspecialchars($_POST['message'])) : null;

    if (empty($name) || empty($email) || empty($message) || $property_id <= 0) {
        $response['message'] = "All fields (name, email, message, propertyId) are required.";
        http_response_code(400);
    } else if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $response['message'] = "Invalid email format.";
        http_response_code(400);
    } else {
        $stmt = $conn->prepare("INSERT INTO inquiries (property_id, property_name, name, email, message) VALUES (?, ?, ?, ?, ?)");
        if ($stmt) {
            $stmt->bind_param("issss", $property_id, $property_name, $name, $email, $message);
            if ($stmt->execute()) {
                $response = ["success" => true, "message" => "Inquiry submitted successfully."];
            } else {
                $response['message'] = "Failed to submit inquiry.";
                error_log("Submit Inquiry DB Error: " . $stmt->error);
                http_response_code(500);
            }
            $stmt->close();
        } else { /* ... handle prepare error ... */ $response['message'] = "Database error."; http_response_code(500); }
    }
}

$conn->close();
echo json_encode($response);
?>