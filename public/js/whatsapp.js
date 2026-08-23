/**
 * WhatsApp Delivery Service
 * Supports Twilio WhatsApp API with ContentSid Template and Direct WhatsApp Fallback.
 * 
 * @param {string} customerName - The name of the customer
 * @param {string} customerPhone - The phone number to send to
 * @param {Blob} pdfBlob - The PDF blob of the invoice
 * @returns {Promise<boolean>} - True if sent successfully
 */
window.sendWhatsAppBill = async function (customerName, customerPhone, pdfBlob) {
  return new Promise(async (resolve) => {
    try {
      console.log(`[WHATSAPP API] Initiating send to ${customerPhone}`);

      if (!customerPhone) {
        console.warn("[WHATSAPP API] No phone number provided. Skipping delivery.");
        return resolve(false);
      }

      // 1. Clean and format phone number (defaults to India +91)
      let phoneClean = customerPhone.replace(/\D/g, '');
      if (phoneClean.length === 10) {
        phoneClean = '91' + phoneClean;
      }
      const formattedPhone = `whatsapp:+${phoneClean}`;
      const displayName = customerName || 'Customer';

      // 2. Twilio Credentials & Template Configuration
      const TWILIO_ACCOUNT_SID = 'AC8b3654c4891233dc6747a0bd795f1b98';
      const TWILIO_AUTH_TOKEN = '5d4a4fe7f9ade5693349b3f51a90bd0d';
      const TWILIO_FROM_NUMBER = 'whatsapp:+17372212163';
      const TWILIO_CONTENT_SID = 'HXfe5ab5f00277942d4d4200328b4d403c';

      // Twilio Basic Auth
      const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

      // Customized Bill Message (for direct WhatsApp or fallback)
      const billSummary = `🧾 *Ram Provision Store - Invoice*\n\nHello *${displayName}*,\nThank you for your purchase at Ram Provision Store!\nYour invoice has been generated.\n\n_Powered by Smart Vyapar_`;

      // Twilio form-urlencoded payload with ContentSid
      const urlEncodedData = new URLSearchParams();
      urlEncodedData.append('To', formattedPhone);
      urlEncodedData.append('From', TWILIO_FROM_NUMBER);
      urlEncodedData.append('ContentSid', TWILIO_CONTENT_SID);
      urlEncodedData.append('ContentVariables', JSON.stringify({
        "1": displayName,
        "2": "Ram Provision Store"
      }));

      try {
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: urlEncodedData
        });

        const result = await response.json();

        if (response.ok) {
          console.log(`[TWILIO API] Message delivered successfully!`, result);
          window.showToast?.(`✅ Bill sent to ${displayName} on WhatsApp (+${phoneClean})`);
          return resolve(true);
        } else {
          console.warn("[TWILIO API] Twilio sandbox returned error:", result.message || result);
          // Fall through to Direct WhatsApp Link
        }
      } catch (twilioErr) {
        console.warn("[TWILIO API] Twilio fetch failed, using WhatsApp Direct fallback:", twilioErr);
      }

      // 3. Fallback: Direct WhatsApp (wa.me)
      // Opens WhatsApp app/web pre-filled with customer bill message
      const directUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(billSummary)}`;
      console.log(`[WHATSAPP API] Opening WhatsApp direct link: ${directUrl}`);
      
      const opened = window.open(directUrl, '_blank');
      if (!opened) {
        window.location.href = directUrl;
      }
      
      window.showToast?.(`📱 WhatsApp opened for ${displayName} (+${phoneClean})`);
      resolve(true);

    } catch (error) {
      console.error("[WHATSAPP API] Error:", error);
      window.showToast?.('Could not send WhatsApp message', true);
      resolve(false);
    }
  });
};
