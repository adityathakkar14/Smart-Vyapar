<?php
require_once __DIR__ . '/../db.php';
header('Content-Type: application/json');

try {
    $pdo = getDbConnection();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Simple endpoint to get the first merchant for demo purposes
        $stmt = $pdo->query("SELECT * FROM merchants LIMIT 1");
        $merchant = $stmt->fetch();
        echo json_encode(['status' => 'success', 'data' => $merchant]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
