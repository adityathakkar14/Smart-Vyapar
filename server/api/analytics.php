<?php
require_once __DIR__ . '/../db.php';
header('Content-Type: application/json');

try {
    $pdo = getDbConnection();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        
        // 1. Today's Revenue
        $stmtToday = $pdo->query("
            SELECT COALESCE(SUM(total_amount), 0) as today_revenue 
            FROM invoices 
            WHERE DATE(date_created) = CURDATE()
        ");
        $todayRevenue = $stmtToday->fetchColumn();

        // 2. Revenue Trend (Last 7 Days)
        $stmtTrend = $pdo->query("
            SELECT DATE(date_created) as date, COALESCE(SUM(total_amount), 0) as revenue
            FROM invoices
            WHERE date_created >= DATE(NOW() - INTERVAL 7 DAY)
            GROUP BY DATE(date_created)
            ORDER BY DATE(date_created) ASC
        ");
        $revenueTrend = $stmtTrend->fetchAll();

        // Ensure all 7 days are represented, even if 0 revenue (simplified approach: just return what we have, JS can fill gaps or just plot existing data)

        // 3. Top Selling Items
        $stmtTopItems = $pdo->query("
            SELECT item_name, COUNT(*) as count 
            FROM invoice_items 
            GROUP BY item_name 
            ORDER BY count DESC 
            LIMIT 5
        ");
        $topItems = $stmtTopItems->fetchAll();

        // 4. Recent Invoices
        $stmtRecent = $pdo->query("
            SELECT invoice_id, customer_name, total_amount, date_created 
            FROM invoices 
            ORDER BY date_created DESC 
            LIMIT 10
        ");
        $recentInvoices = $stmtRecent->fetchAll();

        echo json_encode([
            'status' => 'success',
            'data' => [
                'todayRevenue' => (float)$todayRevenue,
                'revenueTrend' => $revenueTrend,
                'topItems' => $topItems,
                'recentInvoices' => $recentInvoices
            ]
        ]);

    } else {
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
