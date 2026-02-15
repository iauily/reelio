<?php
// api/db_config.php

// Database connection parameters
define('DB_HOST', 'localhost'); // Your database host (usually 'localhost' for XAMPP)
define('DB_NAME', 'reelio_db'); // The database name you created earlier
define('DB_USER', 'root');     // Your database username (usually 'root' for XAMPP)
define('DB_PASS', 'Jochimaritrellet28_');         // Your database password (usually empty for XAMPP, or 'mysql' on MAMP)

$dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on errors
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Fetch associative arrays by default
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Disable emulation for better performance and security
];

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    // Log the error (e.g., to a file, not displayed to the user for security)
    error_log("Database Connection Error: " . $e->getMessage());
    // Display a generic error message to the user if connection fails
    die("<h1>Database connection failed. Please try again later.</h1>");
}
?>