document.addEventListener('DOMContentLoaded', () => {
  // State
  let billItems = [];

  // DOM Elements
  const form = document.getElementById('billing-form');
  const btnAddItem = document.getElementById('btn-add-item');
  const btnClearForm = document.getElementById('btn-clear-form');
  const btnGenerateBill = document.getElementById('btn-generate-bill');
  
  const itemNameInput = document.getElementById('item-name');
  const itemQtyInput = document.getElementById('item-qty');
  const itemPriceInput = document.getElementById('item-price');
  
  const itemsTbody = document.getElementById('items-tbody');
  const itemsTfoot = document.getElementById('items-tfoot');
  const grandTotalEl = document.getElementById('grand-total');
  
  // Format currency
  const formatCurrency = (amount) => {
    return '₹' + parseFloat(amount).toFixed(2);
  };

  // Add Item to Bill
  btnAddItem.addEventListener('click', () => {
    const name = itemNameInput.value.trim();
    const qty = parseFloat(itemQtyInput.value);
    const price = parseFloat(itemPriceInput.value);

    if (!name || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
      alert('Please fill out item name, valid quantity, and valid price.');
      return;
    }

    const total = qty * price;
    const item = {
      id: Date.now().toString(),
      name,
      qty,
      price,
      total
    };

    billItems.push(item);
    renderItems();
    
    // Clear item inputs only
    itemNameInput.value = '';
    itemQtyInput.value = '';
    itemPriceInput.value = '';
    itemNameInput.focus();
  });

  // Clear Form (Everything)
  btnClearForm.addEventListener('click', () => {
    if(confirm('Clear entire form and bill?')) {
      form.reset();
      billItems = [];
      renderItems();
    }
  });

  // Remove Item
  window.removeItem = (id) => {
    billItems = billItems.filter(item => item.id !== id);
    renderItems();
  };

  // Render Items Table
  function renderItems() {
    itemsTbody.innerHTML = '';
    
    if (billItems.length === 0) {
      itemsTbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted py-3">No items added yet.</td>
        </tr>
      `;
      itemsTfoot.classList.add('d-none');
      btnGenerateBill.disabled = true;
      return;
    }

    let grandTotal = 0;
    
    billItems.forEach(item => {
      grandTotal += item.total;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.qty} @ ${formatCurrency(item.price)}</td>
        <td class="text-end fw-medium">${formatCurrency(item.total)}</td>
        <td class="text-end">
          <button class="btn btn-sm text-danger px-1 py-0" onclick="removeItem('${item.id}')" aria-label="Remove">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      itemsTbody.appendChild(tr);
    });

    // Update footer
    grandTotalEl.textContent = formatCurrency(grandTotal);
    itemsTfoot.classList.remove('d-none');
    
    // Enable Generate Bill button if customer details are roughly present
    // For demo flexibility, we allow it as long as there is an item
    btnGenerateBill.disabled = false;
  }
  
  // Show Toast Helper (Globally available for other scripts)
  window.showToast = (message, isError = false) => {
    const toastEl = document.getElementById('notification-toast');
    const toastBody = document.getElementById('toast-message');
    toastBody.textContent = message;
    
    if (isError) {
      toastEl.classList.remove('bg-success');
      toastEl.classList.add('bg-danger');
    } else {
      toastEl.classList.remove('bg-danger');
      toastEl.classList.add('bg-success');
    }
    
    // Check if Bootstrap is loaded
    if (typeof bootstrap !== 'undefined') {
      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    } else {
      alert(message);
    }
  };

  // Generate & Send Bill
  btnGenerateBill.addEventListener('click', async () => {
    if (billItems.length === 0) return;
    
    // UI Loading state
    const originalText = btnGenerateBill.innerHTML;
    btnGenerateBill.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    btnGenerateBill.disabled = true;

    try {
      // Gather data
      const customerName = document.getElementById('customer-name').value.trim();
      const customerPhone = document.getElementById('customer-phone').value.trim();
      const totalAmount = billItems.reduce((sum, item) => sum + item.total, 0);
      const date = new Date().toLocaleDateString('en-IN');

      const invoiceData = {
        customerName,
        customerPhone,
        items: billItems,
        totalAmount,
        date
      };

      // 1. Generate PDF (Phase 4)
      let pdfBlob = null;
      if (typeof window.generateInvoicePDF === 'function') {
         pdfBlob = await window.generateInvoicePDF(invoiceData);
      } else {
         console.warn("generateInvoicePDF is not defined. Ensure pdf.js is loaded.");
      }

      // 2. Save to DB with Offline LocalStorage Fallback (Phase 5)
      let invoiceSaved = false;
      try {
        const response = await fetch('../server/api/invoices.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(invoiceData)
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success') {
            console.log("Invoice saved to server DB with ID:", result.invoice_id);
            window.showToast?.('Invoice generated and saved to database!');
            invoiceSaved = true;
          }
        }
      } catch (dbError) {
        console.warn("Server DB not available, falling back to local storage:", dbError);
      }

      // Always sync/fallback to LocalStorage for offline PWA & static hosts (Vercel)
      saveInvoiceLocally(invoiceData);
      if (!invoiceSaved) {
        window.showToast?.('Invoice generated and saved to offline storage!');
      }

      // 3. WhatsApp Delivery (Phase 6)
      if (typeof window.sendWhatsAppBill === 'function') {
         // Keep spinner active while sending
         btnGenerateBill.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending WhatsApp...';
         await window.sendWhatsAppBill(customerName, customerPhone, pdfBlob);
      } else {
         console.warn("sendWhatsAppBill is not defined. Ensure whatsapp.js is loaded.");
      }
      
    } catch (err) {
      console.error(err);
      window.showToast?.('Error generating bill.', true);
    } finally {
      // Restore UI state
      btnGenerateBill.innerHTML = originalText;
      btnGenerateBill.disabled = false;
    }
  });

  // Local Storage fallback helper for offline/static deployment
  function saveInvoiceLocally(invoiceData) {
    try {
      const existing = JSON.parse(localStorage.getItem('smart_vyapar_invoices') || '[]');
      const newInvoice = {
        invoice_id: existing.length > 0 ? (Number(existing[0].invoice_id) + 1) : 1001,
        customer_name: invoiceData.customerName || 'Cash Customer',
        customer_phone: invoiceData.customerPhone || '',
        total_amount: invoiceData.totalAmount,
        date_created: new Date().toISOString().slice(0, 19).replace('T', ' '),
        items: invoiceData.items
      };
      existing.unshift(newInvoice);
      localStorage.setItem('smart_vyapar_invoices', JSON.stringify(existing));
      console.log("[PWA LocalStore] Invoice saved locally:", newInvoice);
      return newInvoice.invoice_id;
    } catch (e) {
      console.error("[PWA LocalStore] Failed to save locally:", e);
      return Date.now();
    }
  }
});

