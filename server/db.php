<?php
require_once __DIR__ . '/config/db.config.php';

function getDbConnection() {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (\PDOException $e) {
        // Fallback for setup script which connects without dbname first
        if ($e->getCode() == 1049) { // Unknown database
            $dsn_no_db = "mysql:host=" . DB_HOST . ";charset=utf8mb4";
            return new PDO($dsn_no_db, DB_USER, DB_PASS, $options);
        }
        throw new \PDOException($e->getMessage(), (int)$e->getCode());
    }
}
?>
