<?php
/**
 * Database & Environment Configuration for Smart Vyapar
 * Automatically loads .env.local / .env from the project root.
 */

function loadSmartVyaparEnv($filePath) {
    if (!file_exists($filePath) || !is_readable($filePath)) {
        return;
    }
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value, " \t\n\r\0\x0B\"'");
            if (getenv($key) === false) {
                putenv("{$key}={$value}");
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
            }
        }
    }
}

// Search root for .env.local, then .env
$projectRoot = dirname(__DIR__, 2);
loadSmartVyaparEnv($projectRoot . '/.env.local');
loadSmartVyaparEnv($projectRoot . '/.env');

// Define Database Constants
$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbPort = getenv('DB_PORT') ?: '3306';

// If DB_HOST does not already have a port and a custom port is set (and not standard 3306), combine them
if (strpos($dbHost, ':') === false && !empty($dbPort) && $dbPort !== '3306') {
    $dbHost = "{$dbHost}:{$dbPort}";
}

define('DB_HOST', $dbHost);
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
define('DB_NAME', getenv('DB_NAME') ?: 'smart_vyapar');
?>
