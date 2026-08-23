<?php
/**
 * Smart Vyapar - Server-side AI Voice Parser Endpoint
 * Supports:
 * 1. Text Transcript -> Gemini NLP extraction
 * 2. Raw Audio (Base64) -> Gemini Multimodal Direct Audio Listening & Extraction
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

$transcript = trim($data['transcript'] ?? '');
$audioBase64 = trim($data['audioBase64'] ?? '');
$mimeType = trim($data['mimeType'] ?? 'audio/webm');

if (empty($transcript) && empty($audioBase64)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Either transcript or audioBase64 is required']);
    exit;
}

// Resolve Gemini Key
$apiKey = getenv('GEMINI_API_KEY') 
       ?: ($_ENV['GEMINI_API_KEY'] ?? ($_SERVER['GEMINI_API_KEY'] ?? ($GLOBALS['SMART_VYAPAR_ENV']['GEMINI_API_KEY'] ?? '')));

if (empty($apiKey) && !empty($data['apiKey'])) {
    $apiKey = trim($data['apiKey']);
}
if (empty($apiKey)) {
    $apiKey = 'AIzaSyCwgfkmhIaQmMcWueCqVHfImoXR4XgeA1I';
}

$prompt = <<<PROMPT
You are a billing assistant for an Indian retail/grocery store.
Listen to and extract structured billing details from this voice input (spoken in Gujarati, Hindi, or English).

Return ONLY valid JSON (no explanation, no markdown block):
{
  "customerName": "English name or null",
  "itemName": "English grocery/product name or null",
  "quantity": number or null,
  "price": number or null,
  "transcription": "Spoken text in original language"
}

Rules:
1. customerName: Person's name in English Latin letters. Remove suffixes like bhai, ben, ji, ko, ne. (e.g. "રમેશભાઈ" -> "Rameshbhai", "સુરેશ" -> "Suresh"). If no customer mentioned, return null.
2. itemName: ALWAYS translate or standardize the product to English. (e.g. ચોખા/चावल -> "Rice", ખાંડ/चीनी -> "Sugar", તેલ/तेल -> "Cooking Oil", ઘી/घी -> "Desi Ghee", દૂધ/दूध -> "Milk", દાળ/દાલ -> "Tuver Dal", સાબુ -> "Soap", Cadbury -> "Cadbury").
3. quantity: Numeric quantity only (no unit strings). Parse spoken numbers ("ek"->1, "be"->2, "tran"->3, "panch"->5, "das"->10, "darjan"->12). If omitted, return null.
4. price: Numeric price per unit in rupees only. Parse spoken prices ("chalis"->40, "pachas"->50, "sau"->100, "basso"->200). If omitted, return null.
PROMPT;

// Construct payload (Text or Multimodal Audio)
$parts = [];
if (!empty($audioBase64)) {
    $parts[] = [
        'inlineData' => [
            'mimeType' => $mimeType,
            'data' => $audioBase64
        ]
    ];
}
if (!empty($transcript)) {
    $prompt .= "\n\nSpoken transcript: \"{$transcript}\"";
}
$parts[] = ['text' => $prompt];

$models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.7-flash'];
$extracted = null;
$lastError = '';

foreach ($models as $model) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
    
    $payload = json_encode([
        'contents' => [
            ['parts' => $parts]
        ],
        'generationConfig' => [
            'temperature' => 0.1,
            'maxOutputTokens' => 1000,
            'responseMimeType' => 'application/json'
        ]
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT => 9,
        CURLOPT_SSL_VERIFYPEER => false
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode === 200 && !empty($response)) {
        $respData = json_decode($response, true);
        $rawText = $respData['candidates'][0]['content']['parts'][0]['text'] ?? '';
        if (!empty($rawText)) {
            $cleanJson = trim(preg_replace('/^```json\s*/i', '', $rawText));
            $cleanJson = trim(preg_replace('/```$/i', '', $cleanJson));
            $parsed = json_decode($cleanJson, true);
            if ($parsed && is_array($parsed)) {
                $extracted = [
                    'customerName' => !empty($parsed['customerName']) ? trim($parsed['customerName']) : null,
                    'itemName' => !empty($parsed['itemName']) ? trim($parsed['itemName']) : null,
                    'quantity' => isset($parsed['quantity']) && is_numeric($parsed['quantity']) ? (float)$parsed['quantity'] : null,
                    'price' => isset($parsed['price']) && is_numeric($parsed['price']) ? (float)$parsed['price'] : null,
                    'transcription' => !empty($parsed['transcription']) ? trim($parsed['transcription']) : ''
                ];
                break;
            }
        }
    } else {
        $lastError = "Model {$model} returned HTTP {$httpCode}: " . substr($response, 0, 150) . " " . $curlError;
    }
}

if ($extracted !== null) {
    echo json_encode([
        'success' => true,
        'data' => $extracted,
        'model' => $model
    ]);
} else {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'error' => 'AI Voice Extraction Failed',
        'details' => $lastError
    ]);
}
