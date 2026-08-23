<?php
require_once __DIR__ . '/config/db.config.php';

function getDbConnection() {
    $rawHost = defined('DB_HOST') ? DB_HOST : (getenv('DB_HOST') ?: 'localhost');
    $dbName  = defined('DB_NAME') ? DB_NAME : (getenv('DB_NAME') ?: 'smart_vyapar');
    $dbUser  = defined('DB_USER') ? DB_USER : (getenv('DB_USER') ?: 'root');
    $dbPass  = defined('DB_PASS') ? DB_PASS : (getenv('DB_PASS') ?: '');

    // Parse host and custom port if specified (e.g. localhost:3307 or 127.0.0.1:3306)
    $port = null;
    $host = $rawHost;
    if (strpos($rawHost, ':') !== false) {
        list($host, $port) = explode(':', $rawHost, 2);
    }

    $dsn = "mysql:host={$host};" . ($port ? "port={$port};" : "") . "dbname={$dbName};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ];

    try {
        return new PDO($dsn, $dbUser, $dbPass, $options);
    } catch (\PDOException $e) {
        // Fallback for setup script if connecting before database is created
        if ($e->getCode() == 1049) {
            $dsn_no_db = "mysql:host={$host};" . ($port ? "port={$port};" : "") . "charset=utf8mb4";
            return new PDO($dsn_no_db, $dbUser, $dbPass, $options);
        }
        throw new \PDOException("Database Connection Error: " . $e->getMessage(), (int)$e->getCode());
    }
}
?>
