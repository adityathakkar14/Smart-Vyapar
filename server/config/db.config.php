<?php
/**
 * Database & Environment Configuration for Smart Vyapar
 * Automatically loads .env and .env.local across local and Hostinger environments.
 */

if (!isset($GLOBALS['SMART_VYAPAR_ENV'])) {
    $GLOBALS['SMART_VYAPAR_ENV'] = [];
}

function parseAndLoadEnv($filePath, $override = false) {
    if (!file_exists($filePath) || !is_readable($filePath)) {
        return;
    }
    
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        // Skip comments and empty lines
        if ($line === '' || strpos($line, '#') === 0) {
            continue;
        }
        
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            // Clean quotes and trailing whitespace/tabs
            $value = trim($value, " \t\n\r\0\x0B\"'");
            
            // If override is true or key not set, assign value
            if ($override || !isset($GLOBALS['SMART_VYAPAR_ENV'][$key]) || $GLOBALS['SMART_VYAPAR_ENV'][$key] === '') {
                $GLOBALS['SMART_VYAPAR_ENV'][$key] = $value;
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
                @putenv("{$key}={$value}");
            }
        }
    }
}

// 1. First load local defaults if .env.local exists
$projectRoot = dirname(__DIR__, 2);
parseAndLoadEnv($projectRoot . '/.env.local', false);

// 2. Then load main .env (overriding with Hostinger/production values)
$possibleEnvPaths = [
    $projectRoot . '/.env',
    dirname(__DIR__) . '/.env',
    __DIR__ . '/.env',
    isset($_SERVER['DOCUMENT_ROOT']) ? $_SERVER['DOCUMENT_ROOT'] . '/.env' : null
];

foreach ($possibleEnvPaths as $path) {
    if ($path && file_exists($path)) {
        parseAndLoadEnv($path, true); // true = override with active .env
    }
}

// Helper to retrieve environment variable with priority
function getEnvValue($key, $default = '') {
    if (isset($GLOBALS['SMART_VYAPAR_ENV'][$key]) && $GLOBALS['SMART_VYAPAR_ENV'][$key] !== '') {
        return $GLOBALS['SMART_VYAPAR_ENV'][$key];
    }
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return $_ENV[$key];
    }
    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
        return $_SERVER[$key];
    }
    $val = getenv($key);
    if ($val !== false && $val !== '') {
        return $val;
    }
    return $default;
}

// Define Database Configuration Constants
$dbHost = getEnvValue('DB_HOST', 'localhost');
$dbPort = getEnvValue('DB_PORT', '3306');
$dbUser = getEnvValue('DB_USER', 'root');
$dbPass = getEnvValue('DB_PASS', '');
$dbName = getEnvValue('DB_NAME', 'smart_vyapar');

// Combine host & custom port if not standard 3306 and port not already in host
if (strpos($dbHost, ':') === false && !empty($dbPort) && $dbPort !== '3306') {
    $dbHost = "{$dbHost}:{$dbPort}";
}

if (!defined('DB_HOST')) define('DB_HOST', $dbHost);
if (!defined('DB_USER')) define('DB_USER', $dbUser);
if (!defined('DB_PASS')) define('DB_PASS', $dbPass);
if (!defined('DB_NAME')) define('DB_NAME', $dbName);
?>
