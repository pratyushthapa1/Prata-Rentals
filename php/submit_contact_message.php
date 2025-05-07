<?php
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
require_once __DIR__ . '/db_connect.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$response = ["success" => false, "message" => "Invalid request method."];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = isset($_POST['name']) ? trim(htmlspecialchars($_POST['name'])) : null;
    $email = isset($_POST['email']) ? trim($_POST['email']) : null;
    $message = isset($_POST['purpose']) ? trim(htmlspecialchars($_POST['purpose'])) : (isset($_POST['message']) ? trim(htmlspecialchars($_POST['message'])) : null); // Check for both 'purpose' and 'message'

    if (empty($name) || empty($email) || empty($message)) {
        $response['message'] = "Name, email, and message are required.";
        http_response_code(400);
    } else if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $response['message'] = "Invalid email format.";
        http_response_code(400);
    } else {
        $stmt = $conn->prepare("INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)");
        if ($stmt) {
            $stmt->bind_param("sss", $name, $email, $message);
            if ($stmt->execute()) {
                $response = ["success" => true, "message" => "Message sent successfully."];
            } else {
                $response['message'] = "Failed to send message.";
                error_log("Submit Contact Message DB Error: " . $stmt->error);
                http_response_code(500);
            }
            $stmt->close();
        } else { /* ... handle prepare error ... */ $response['message'] = "Database error."; http_response_code(500); }
    }
}
$conn->close();
echo json_encode($response);
?>
<?php
require_once __DIR__ . '/db_connect.php';
?>