-- ============================================================
-- Smart Vyapar - MySQL Database Schema
-- Compatible with MySQL 5.7+ / MySQL 8.0+ / MariaDB (Hostinger)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Merchants Table
CREATE TABLE IF NOT EXISTS `merchants` (
  `merchant_id` INT AUTO_INCREMENT PRIMARY KEY,
  `shop_name` VARCHAR(100) NOT NULL,
  `phone_number` VARCHAR(15) NOT NULL,
  `language_preference` VARCHAR(5) DEFAULT 'gu',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Invoices Table
CREATE TABLE IF NOT EXISTS `invoices` (
  `invoice_id` INT AUTO_INCREMENT PRIMARY KEY,
  `merchant_id` INT NOT NULL,
  `customer_name` VARCHAR(100),
  `customer_phone` VARCHAR(15),
  `total_amount` DECIMAL(10,2) NOT NULL,
  `date_created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_merchant_date` (`merchant_id`, `date_created`),
  CONSTRAINT `fk_invoices_merchant` FOREIGN KEY (`merchant_id`) REFERENCES `merchants` (`merchant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Invoice Items Table
CREATE TABLE IF NOT EXISTS `invoice_items` (
  `item_id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` INT NOT NULL,
  `item_name` VARCHAR(100) NOT NULL,
  `quantity` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  INDEX `idx_invoice_items` (`invoice_id`),
  CONSTRAINT `fk_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`invoice_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Seed Default Merchant (Ram Provision Store)
INSERT INTO `merchants` (`merchant_id`, `shop_name`, `phone_number`, `language_preference`)
VALUES (1, 'Ram Provision Store', '9876543210', 'gu')
ON DUPLICATE KEY UPDATE `shop_name` = VALUES(`shop_name`);

SET FOREIGN_KEY_CHECKS = 1;
