/**
 * Mock WhatsApp Delivery Service
 * Designed to be swapped with a real Twilio/WhatsApp Cloud API later.
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

      // ==========================================
      // TWILIO WHATSAPP API INTEGRATION MODEL
      // ==========================================
      // 1. Your Twilio Account SID & Primary Auth Token
      const TWILIO_ACCOUNT_SID = 'AC8b3654c4891233dc6747a0bd795f1b98';
      const TWILIO_AUTH_TOKEN = '5d4a4fe7f9ade5693349b3f51a90bd0d';

      // 2. The Twilio Sandbox Number
      const TWILIO_FROM_NUMBER = 'whatsapp:+17372212163';

      // 3. Your Template ContentSid
      const TWILIO_CONTENT_SID = 'HXfe5ab5f00277942d4d4200328b4d403c';

      // Format phone number (ensure country code, e.g., +91 for India)
      let phoneClean = customerPhone.replace(/\D/g, '');
      if (phoneClean.length === 10) {
        phoneClean = '91' + phoneClean;
      }
      const formattedPhone = `whatsapp:+${phoneClean}`;

      // Twilio Basic Auth: (ACCOUNT_SID : AUTH_TOKEN)
      const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

      // Customized Bill Message
      const billSummary = `🧾 *Ram Provision Store - Invoice*\n\nHello *${customerName || 'Customer'}*,\nThank you for your purchase at Ram Provision Store!\nYour invoice PDF is saved.\n\n_Powered by Smart Vyapar_`;

      // Twilio form-urlencoded data
      const urlEncodedData = new URLSearchParams();
      urlEncodedData.append('To', formattedPhone);
      urlEncodedData.append('From', TWILIO_FROM_NUMBER);
      urlEncodedData.append('Body', billSummary);

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: urlEncodedData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send Twilio message');
      }

      console.log(`[TWILIO API] Message delivered successfully!`, result);
      const displayName = customerName || 'Customer';
      window.showToast?.(`✅ Bill sent to ${displayName} on WhatsApp (+${phoneClean})`);
      resolve(true);

    } catch (error) {
      console.error("[WHATSAPP API] Error:", error);
      window.showToast?.('Failed to send WhatsApp message', true);
      resolve(false);
    }
  });
};
