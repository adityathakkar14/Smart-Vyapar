<?php
require_once __DIR__ . '/db.php';

header('Content-Type: text/plain; charset=utf-8');

try {
    echo "=== Smart Vyapar Database Setup ===\n\n";
    $pdo = getDbConnection();
    
    // Attempt to create/select database (if user has privileges)
    try {
        $dbName = defined('DB_NAME') ? DB_NAME : 'smart_vyapar';
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName`");
        $pdo->exec("USE `$dbName`");
    } catch (\Exception $dbEx) {
        // Shared hosts like Hostinger create DBs via cPanel/hPanel, so ignore DB creation errors
        echo "Note: Using existing database directly.\n";
    }

    // 1. Create merchants table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `merchants` (
          `merchant_id` INT AUTO_INCREMENT PRIMARY KEY,
          `shop_name` VARCHAR(100) NOT NULL,
          `phone_number` VARCHAR(15) NOT NULL,
          `language_preference` VARCHAR(5) DEFAULT 'gu',
          `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✓ Table 'merchants' ready.\n";

    // 2. Create invoices table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `invoices` (
          `invoice_id` INT AUTO_INCREMENT PRIMARY KEY,
          `merchant_id` INT NOT NULL,
          `customer_name` VARCHAR(100),
          `customer_phone` VARCHAR(15),
          `total_amount` DECIMAL(10,2) NOT NULL,
          `date_created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`merchant_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✓ Table 'invoices' ready.\n";

    // 3. Create invoice_items table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `invoice_items` (
          `item_id` INT AUTO_INCREMENT PRIMARY KEY,
          `invoice_id` INT NOT NULL,
          `item_name` VARCHAR(100) NOT NULL,
          `quantity` INT NOT NULL,
          `price` DECIMAL(10,2) NOT NULL,
          FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`invoice_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✓ Table 'invoice_items' ready.\n";

    // 4. Seed default merchant
    $stmt = $pdo->query("SELECT COUNT(*) FROM `merchants`");
    $count = $stmt->fetchColumn();
    
    if ($count == 0) {
        $insert = $pdo->prepare("INSERT INTO `merchants` (`merchant_id`, `shop_name`, `phone_number`, `language_preference`) VALUES (1, ?, ?, ?)");
        $insert->execute(['Ram Provision Store', '9876543210', 'gu']);
        echo "✓ Inserted seed merchant 'Ram Provision Store'.\n";
    } else {
        echo "✓ Merchant record already exists.\n";
    }

    echo "\n🎉 Database setup completed successfully!\n";

} catch (\PDOException $e) {
    echo "❌ Database Error: " . $e->getMessage() . "\n";
    echo "Please check your credentials in server/config/db.config.php\n";
}
?>
