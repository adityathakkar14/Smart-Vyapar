/**
 * Smart Vyapar — WhatsApp Direct Delivery Service (Free WhatsApp Web / App API)
 * Directly redirects to WhatsApp pre-filled with the itemized invoice bill.
 * 
 * @param {string} customerName - The name of the customer
 * @param {string} customerPhone - The phone number of the customer
 * @param {Blob} [pdfBlob] - The PDF blob of the invoice (optional)
 * @param {Object} [invoiceData] - Structured invoice data containing items and totals
 * @returns {Promise<boolean>} - True if redirected successfully
 */
window.sendWhatsAppBill = async function (customerName, customerPhone, pdfBlob, invoiceData) {
  return new Promise((resolve) => {
    try {
      const displayName = (customerName || '').trim() || 'Valued Customer';
      const rawPhone = (customerPhone || '').trim();

      // 1. Clean and format phone number (defaults to India +91 for 10-digit numbers)
      let phoneClean = rawPhone.replace(/\D/g, '');
      if (phoneClean.length === 10) {
        phoneClean = '91' + phoneClean;
      } else if (phoneClean.length > 10 && phoneClean.startsWith('0')) {
        phoneClean = '91' + phoneClean.replace(/^0+/, '');
      }

      // 2. Format Date
      const today = invoiceData?.date || new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      // 3. Build itemized bill lines
      let itemsListText = '';
      let grandTotal = 0;

      if (invoiceData?.items && Array.isArray(invoiceData.items) && invoiceData.items.length > 0) {
        grandTotal = invoiceData.totalAmount || invoiceData.items.reduce((s, i) => s + (i.total || 0), 0);
        itemsListText = invoiceData.items.map((item, idx) => {
          const itemTotal = (item.total != null) ? Number(item.total).toFixed(2) : (item.qty * item.price).toFixed(2);
          return `${idx + 1}. *${item.name}* (${item.qty} × ₹${Number(item.price).toFixed(2)}) = ₹${itemTotal}`;
        }).join('\n');
      } else {
        // Fallback: Read items from current table if not passed
        const tableRows = document.querySelectorAll('#items-tbody tr');
        const items = [];
        tableRows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            const name = cells[0].textContent.trim();
            const qtyPrice = cells[1].textContent.trim();
            const total = cells[2].textContent.trim();
            if (name && !name.includes('No items')) {
              items.push(`• *${name}* (${qtyPrice}) = ${total}`);
            }
          }
        });
        const grandTotalEl = document.getElementById('grand-total');
        grandTotal = grandTotalEl ? grandTotalEl.textContent.trim() : '₹0.00';
        itemsListText = items.join('\n');
      }

      // 4. Construct professional formatted WhatsApp message
      const shopName = document.getElementById('shop-name-header')?.textContent?.trim() || 'Ram Provision Store';
      
      let message = `🧾 *${shopName} - Invoice*\n\n`;
      message += `Hello *${displayName}*,\n`;
      message += `Thank you for your purchase at ${shopName}!\n`;
      message += `Your invoice has been generated.\n\n`;

      if (itemsListText) {
        message += `*Bill Details:*\n`;
        message += `${itemsListText}\n\n`;
        const totalStr = (typeof grandTotal === 'number') ? `₹${grandTotal.toFixed(2)}` : `${grandTotal}`;
        message += `💰 *Grand Total:* *${totalStr}*\n\n`;
      }

      message += `_Powered by Smart Vyapar_`;

      const encodedMessage = encodeURIComponent(message);

      // 5. Construct direct WhatsApp link (free API)
      let waUrl = '';
      if (phoneClean && phoneClean.length >= 10) {
        waUrl = `https://wa.me/${phoneClean}?text=${encodedMessage}`;
      } else {
        // If no phone number entered, open WhatsApp contact chooser
        waUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
      }

      console.log(`[WhatsApp Free API] Redirecting to: ${waUrl}`);

      // 6. Open WhatsApp Web / App
      const win = window.open(waUrl, '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        // Popup was blocked by browser, redirect current window
        window.location.href = waUrl;
      }

      window.showToast?.(
        phoneClean 
          ? `📱 WhatsApp opened for ${displayName} (+${phoneClean})` 
          : `📱 WhatsApp opened! Select contact to send.`
      );

      resolve(true);

    } catch (error) {
      console.error('[WhatsApp Free API] Error creating WhatsApp link:', error);
      window.showToast?.('Could not open WhatsApp', true);
      resolve(false);
    }
  });
};
