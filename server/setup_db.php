<?php
require_once __DIR__ . '/db.php';

try {
    // 1. Connect without specific DB to create it if it doesn't exist
    $pdo = getDbConnection();
    
    // Check if database is already selected, if not create and select
    $dbName = DB_NAME;
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName`");
    $pdo->exec("USE `$dbName`");

    // 2. Create merchants table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS merchants (
          merchant_id INT AUTO_INCREMENT PRIMARY KEY,
          shop_name VARCHAR(100) NOT NULL,
          phone_number VARCHAR(15) NOT NULL,
          language_preference VARCHAR(5) DEFAULT 'gu',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ");
    echo "Table 'merchants' created or already exists.\n";

    // 3. Create invoices table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS invoices (
          invoice_id INT AUTO_INCREMENT PRIMARY KEY,
          merchant_id INT NOT NULL,
          customer_name VARCHAR(100),
          customer_phone VARCHAR(15),
          total_amount DECIMAL(10,2) NOT NULL,
          date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (merchant_id) REFERENCES merchants(merchant_id)
        );
    ");
    echo "Table 'invoices' created or already exists.\n";

    // 4. Create invoice_items table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS invoice_items (
          item_id INT AUTO_INCREMENT PRIMARY KEY,
          invoice_id INT NOT NULL,
          item_name VARCHAR(100) NOT NULL,
          quantity INT NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
        );
    ");
    echo "Table 'invoice_items' created or already exists.\n";

    // 5. Seed the merchants table
    $stmt = $pdo->query("SELECT COUNT(*) FROM merchants");
    $count = $stmt->fetchColumn();
    
    if ($count == 0) {
        $insert = $pdo->prepare("INSERT INTO merchants (shop_name, phone_number, language_preference) VALUES (?, ?, ?)");
        $insert->execute(['Ram Provision Store', '9876543210', 'gu']);
        echo "Inserted seed data for 'Ram Provision Store'.\n";
    } else {
        echo "Seed data already exists.\n";
    }

    echo "Database setup complete!\n";

} catch (PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
?>
