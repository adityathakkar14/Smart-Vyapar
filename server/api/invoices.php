<?php
require_once __DIR__ . '/../db.php';
header('Content-Type: application/json');

try {
    $pdo = getDbConnection();
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Read raw JSON input
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data || empty($data['items'])) {
            throw new Exception("Invalid data or empty items array");
        }

        // Hardcode merchant_id for demo (since we seeded merchant_id 1)
        $merchantId = 1;
        $customerName = $data['customerName'] ?? null;
        $customerPhone = $data['customerPhone'] ?? null;
        $totalAmount = $data['totalAmount'] ?? 0;
        $items = $data['items'];

        // Begin Transaction
        $pdo->beginTransaction();

        // 1. Insert Invoice
        $stmtInvoice = $pdo->prepare("
            INSERT INTO invoices (merchant_id, customer_name, customer_phone, total_amount) 
            VALUES (?, ?, ?, ?)
        ");
        $stmtInvoice->execute([$merchantId, $customerName, $customerPhone, $totalAmount]);
        
        $invoiceId = $pdo->lastInsertId();

        // 2. Insert Invoice Items
        $stmtItem = $pdo->prepare("
            INSERT INTO invoice_items (invoice_id, item_name, quantity, price) 
            VALUES (?, ?, ?, ?)
        ");

        foreach ($items as $item) {
            $stmtItem->execute([
                $invoiceId,
                $item['name'],
                $item['qty'],
                $item['price']
            ]);
        }

        // Commit Transaction
        $pdo->commit();

        echo json_encode([
            'status' => 'success',
            'message' => 'Invoice saved successfully',
            'invoice_id' => $invoiceId
        ]);

    } else {
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
