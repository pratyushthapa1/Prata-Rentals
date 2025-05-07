<?php
// api/generate_hash.phpheader("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
$plainPassword = 'ashreen123'; // The password you chose
$hashedPassword = password_hash($plainPassword, PASSWORD_DEFAULT);

echo "Password: " . $plainPassword . "<br>";
echo "Hashed Password: " . $hashedPassword;
?>