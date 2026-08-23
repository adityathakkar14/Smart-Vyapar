document.addEventListener('DOMContentLoaded', () => {
  const btnMic = document.getElementById('btn-mic');
  const langSelect = document.getElementById('voice-lang-select');
  const transcriptContainer = document.getElementById('transcript-container');
  const rawTranscriptEl = document.getElementById('raw-transcript');
  
  // Form fields
  const customerNameInput = document.getElementById('customer-name');
  const itemNameInput = document.getElementById('item-name');
  const itemQtyInput = document.getElementById('item-qty');
  const itemPriceInput = document.getElementById('item-price');

  // Check for speech recognition support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    btnMic.disabled = true;
    window.showToast?.('Speech Recognition is not supported in this browser.', true);
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  let isListening = false;

  btnMic.addEventListener('click', async () => {
    if (isListening) {
      if (recognition) recognition.stop();
      return;
    }
    
    // ==========================================
    // BHASHINI API INTEGRATION MODEL
    // ==========================================
    // Bhashini provides ASR (Automatic Speech Recognition). 
    // You must obtain these keys by registering at https://bhashini.gov.in/ulca/
    const BHASHINI_USER_ID = 'YOUR_ULCA_USER_ID';
    const BHASHINI_API_KEY = 'YOUR_ULCA_API_KEY';
    const BHASHINI_PIPELINE_ID = 'YOUR_PIPELINE_ID'; // Depends on language chosen
    
    /* --- UNCOMMENT THIS BLOCK TO USE BHASHINI INSTEAD OF BROWSER API ---
    
    try {
        isListening = true;
        btnMic.classList.add('listening');
        rawTranscriptEl.textContent = 'Listening (Bhashini)...';
        transcriptContainer.classList.remove('d-none');
        
        // 1. Get Microphone Access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];
        
        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });
        
        mediaRecorder.addEventListener('stop', async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            
            // 2. Convert Blob to Base64 (Bhashini requirement)
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Audio = reader.result.split(',')[1];
                
                rawTranscriptEl.textContent = 'Processing with Bhashini...';
                
                // 3. Make the API Call to Bhashini Compute Endpoint
                // (Note: You usually need to call a pipeline configuration endpoint first 
                // to get the compute URL, but this is the general structure)
                const response = await fetch('https://dhruva-api.bhashini.gov.in/services/inference/pipeline', {
                    method: 'POST',
                    headers: {
                        'Authorization': BHASHINI_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        pipelineTasks: [{ taskType: "asr", config: { language: { sourceLanguage: langSelect.value.split('-')[0] } } }],
                        inputData: { audio: [{ audioContent: base64Audio }] }
                    })
                });
                
                const result = await response.json();
                
                if (result.pipelineResponse && result.pipelineResponse[0].output[0].source) {
                    const transcript = result.pipelineResponse[0].output[0].source;
                    rawTranscriptEl.textContent = transcript;
                    parseBillingSentence(transcript); // Process it just like before!
                } else {
                    throw new Error("Invalid response from Bhashini");
                }
                stopListening();
            };
        });
        
        // Record for 5 seconds or until clicked again
        mediaRecorder.start();
        setTimeout(() => {
            if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        }, 5000);
        
        return; // Exit here so we don't use the fallback
    } catch (err) {
        console.error("Bhashini API Error:", err);
        window.showToast?.('Bhashini API error, falling back to browser API', true);
    }
    
    --------------------------------------------------- */

    // Fallback: Default Browser Speech Recognition
    if (recognition) {
        recognition.lang = langSelect.value;
        recognition.start();
    }
  });

  recognition.onstart = () => {
    isListening = true;
    btnMic.classList.add('listening');
    transcriptContainer.classList.remove('d-none');
    rawTranscriptEl.textContent = 'Listening...';
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    rawTranscriptEl.textContent = transcript;
    
    // Parse the transcript
    parseBillingSentence(transcript);
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error);
    window.showToast?.(`Microphone error: ${event.error}. Please try again or type manually.`, true);
    stopListening();
  };

  recognition.onend = () => {
    stopListening();
  };

  function stopListening() {
    isListening = false;
    btnMic.classList.remove('listening');
    setTimeout(() => {
      transcriptContainer.classList.add('d-none');
    }, 8000); // Hide transcript after 8 seconds
  }

  // Predefined keywords
  const itemKeywords = ['rice', 'sugar', 'oil', 'wheat', 'dal', 'chokha', 'khand', 'tel', 'ghau'];
  
  function parseBillingSentence(transcript) {
    // Basic normalization
    const text = transcript.toLowerCase();
    
    let parsedCustomer = '';
    let parsedItem = '';
    let parsedQty = '';
    let parsedPrice = '';

    // 1. Extract Item Name
    for (const item of itemKeywords) {
      if (text.includes(item)) {
        parsedItem = item.charAt(0).toUpperCase() + item.slice(1);
        break;
      }
    }

    // 2. Extract Quantity (number + kilo/kg/liter/piece/nag/gram)
    const qtyRegex = /(\d+(?:\.\d+)?)\s*(kilo|kg|liter|litre|piece|nag|gram|g)/i;
    const qtyMatch = text.match(qtyRegex);
    if (qtyMatch) {
      parsedQty = qtyMatch[1];
    } else {
        // Fallback: Look for a standalone number that might be quantity
        // Exclude the price number (we'll find price next)
        const allNumbers = text.match(/(\d+(?:\.\d+)?)/g) || [];
        if (allNumbers.length === 1) {
            // Only one number, assume it's qty if small, or price if large? 
            // We'll just leave it empty and let user fill if ambiguous.
        } else if (allNumbers.length >= 2) {
            parsedQty = allNumbers[0]; // Usually first number is qty
        }
    }

    // 3. Extract Price (number + rupiya/rupees/₹/rs)
    const priceRegex = /(\d+(?:\.\d+)?)\s*(rupiya|rupees|rs|₹)/i;
    const priceMatch = text.match(priceRegex);
    if (priceMatch) {
      parsedPrice = priceMatch[1];
    } else {
        // Fallback: If there are two numbers, the second one is usually price
        const allNumbers = text.match(/(\d+(?:\.\d+)?)/g) || [];
        if (allNumbers.length >= 2) {
            parsedPrice = allNumbers[1];
        } else if (allNumbers.length === 1 && !parsedQty) {
            // Only one number found, and no explicit unit matched. Could be total price.
            parsedPrice = allNumbers[0];
        }
    }

    // 4. Extract Customer Name
    // Match "Name ne" (Gujarati/Hindi)
    const nameBeforeNeMatch = text.match(/\b([a-z]+)\s+ne\b/i);
    if (nameBeforeNeMatch) {
        parsedCustomer = nameBeforeNeMatch[1];
    } else {
        // Match "to Name" (English)
        const nameAfterToMatch = text.match(/\bto\s+([a-z]+)\b/i);
        if (nameAfterToMatch) {
            parsedCustomer = nameAfterToMatch[1];
        } else {
            // Fallback: First word if it's not a number or item keyword
            const words = text.split(/\s+/);
            if (words.length > 0 && !words[0].match(/\d/) && !itemKeywords.includes(words[0])) {
                parsedCustomer = words[0];
            }
        }
    }
    
    // Capitalize customer name
    if (parsedCustomer) {
        parsedCustomer = parsedCustomer.charAt(0).toUpperCase() + parsedCustomer.slice(1);
    }

    // Auto-fill the form
    let autofilled = false;
    
    if (parsedCustomer && !customerNameInput.value) {
        customerNameInput.value = parsedCustomer;
        autofilled = true;
    }
    if (parsedItem) {
        itemNameInput.value = parsedItem;
        autofilled = true;
    }
    if (parsedQty) {
        itemQtyInput.value = parsedQty;
        autofilled = true;
    }
    if (parsedPrice) {
        itemPriceInput.value = parsedPrice;
        autofilled = true;
    }

    if (autofilled) {
        window.showToast?.('Parsed voice input. Please confirm details.');
        const formEl = document.getElementById('billing-form');
        formEl.style.transition = 'box-shadow 0.3s ease-in-out';
        formEl.style.boxShadow = '0 0 15px rgba(243, 114, 44, 0.5)'; // highlight with saffron color
        setTimeout(() => {
             formEl.style.boxShadow = 'none';
        }, 1500);
    } else {
        window.showToast?.("Couldn't catch that — please fill manually or try again", true);
    }
  }
});
