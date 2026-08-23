<?php
/**
 * Database Configuration for Smart Vyapar
 * 
 * For Localhost (XAMPP):
 *   DB_HOST = 'localhost' (or 'localhost:3307' if using custom XAMPP MySQL port)
 *   DB_USER = 'root'
 *   DB_PASS = ''
 *   DB_NAME = 'smart_vyapar'
 * 
 * For Hostinger (hPanel -> Databases -> MySQL Databases):
 *   DB_HOST = 'localhost'
 *   DB_USER = 'u123456789_user'    (Your Hostinger MySQL Username)
 *   DB_PASS = 'YourStrongPassword'  (Your Hostinger MySQL Password)
 *   DB_NAME = 'u123456789_vyapar'  (Your Hostinger MySQL Database Name)
 */

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: 'smart_vyapar');
?>
