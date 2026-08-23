/**
 * Generates a PDF invoice using jsPDF and jspdf-autotable
 * @param {Object} data - The invoice data
 * @returns {Promise<Blob>} - The PDF blob for further processing (e.g. WhatsApp)
 */
window.generateInvoicePDF = async function(data) {
  return new Promise((resolve, reject) => {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      const { customerName, customerPhone, items, totalAmount, date } = data;
      
      // Colors matching the brand
      const primaryTeal = [15, 76, 92];
      const accentSaffron = [243, 114, 44];
      
      // Header Section
      doc.setFillColor(...primaryTeal);
      doc.rect(0, 0, 210, 40, 'F'); // Header background
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text("Ram Provision Store", 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text("Smart Billing System", 105, 28, { align: 'center' });
      
      // Invoice Details
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("TAX INVOICE", 14, 55);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const invoiceNo = "INV-" + Math.floor(Math.random() * 1000000);
      doc.text(`Invoice No: ${invoiceNo}`, 14, 65);
      doc.text(`Date: ${date}`, 14, 70);
      
      // Customer Details
      doc.setFont('helvetica', 'bold');
      doc.text("Bill To:", 120, 55);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${customerName || 'Cash Customer'}`, 120, 65);
      if (customerPhone) {
        doc.text(`Phone: ${customerPhone}`, 120, 70);
      }
      
      // Horizontal Line
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 80, 196, 80);
      
      // Items Table
      const tableColumn = ["Item Description", "Qty", "Price (Rs)", "Total (Rs)"];
      const tableRows = [];
      
      items.forEach(item => {
        const itemData = [
          item.name,
          item.qty.toString(),
          item.price.toFixed(2),
          item.total.toFixed(2)
        ];
        tableRows.push(itemData);
      });
      
      doc.autoTable({
        startY: 90,
        margin: { left: 14, right: 14 },
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: primaryTeal, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' }
        },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      // Total Amount
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...primaryTeal);
      doc.text(`Grand Total: Rs ${totalAmount.toFixed(2)}`, 196, finalY, { align: 'right' });
      
      // Footer Note
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text("Thank you for your business! - aapno aabhar", 105, 280, { align: 'center' });
      
      // Save the PDF (Triggers download in browser)
      const fileName = `Invoice_${customerName ? customerName.replace(/\s+/g, '_') : 'Customer'}_${invoiceNo}.pdf`;
      doc.save(fileName);
      
      // Generate Blob for potential WhatsApp use
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
      
    } catch (error) {
      console.error("PDF Generation Error:", error);
      reject(error);
    }
  });
};
