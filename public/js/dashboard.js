document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('dashboard-loading');
  const contentEl = document.getElementById('dashboard-content');
  const todayRevenueEl = document.getElementById('today-revenue');
  const tbodyEl = document.getElementById('recent-invoices-tbody');

  // Format currency helper
  const formatCurrency = (amount) => '₹' + parseFloat(amount).toFixed(2);
  
  // Theme colors
  const primaryTeal = '#0F4C5C';
  const accentSaffron = '#F3722C';
  const pieColors = ['#0F4C5C', '#F3722C', '#2a9d8f', '#e9c46a', '#e76f51'];

  try {
    // Fetch Analytics Data
    const response = await fetch('../server/api/analytics.php');
    const result = await response.json();

    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to fetch analytics');
    }

    const data = result.data;

    // 1. Render Today's Revenue
    todayRevenueEl.textContent = formatCurrency(data.todayRevenue);

    // 2. Render Revenue Trend Chart (Line Chart)
    const trendCtx = document.getElementById('revenueTrendChart').getContext('2d');
    const trendDates = data.revenueTrend.map(d => d.date);
    const trendAmounts = data.revenueTrend.map(d => parseFloat(d.revenue));
    
    new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: trendDates.length ? trendDates : ['No Data'],
        datasets: [{
          label: 'Revenue (₹)',
          data: trendAmounts.length ? trendAmounts : [0],
          borderColor: primaryTeal,
          backgroundColor: 'rgba(15, 76, 92, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: accentSaffron,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // 3. Render Top Items Chart (Doughnut)
    const topCtx = document.getElementById('topItemsChart').getContext('2d');
    const itemLabels = data.topItems.map(i => i.item_name);
    const itemCounts = data.topItems.map(i => parseInt(i.count));
    
    new Chart(topCtx, {
      type: 'doughnut',
      data: {
        labels: itemLabels.length ? itemLabels : ['No Data'],
        datasets: [{
          data: itemCounts.length ? itemCounts : [1],
          backgroundColor: itemLabels.length ? pieColors : ['#ccc'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });

    // 4. Render Recent Invoices Table
    if (data.recentInvoices.length === 0) {
      tbodyEl.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No recent invoices</td></tr>`;
    } else {
      tbodyEl.innerHTML = data.recentInvoices.map(inv => `
        <tr>
          <td class="text-muted small">#${inv.invoice_id}</td>
          <td>${inv.customer_name || 'Cash Customer'}</td>
          <td class="text-end fw-medium">${formatCurrency(inv.total_amount)}</td>
        </tr>
      `).join('');
    }

    // Hide loading, show content
    loadingEl.classList.add('d-none');
    contentEl.classList.remove('d-none');

  } catch (error) {
    console.error("Dashboard Error:", error);
    loadingEl.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <i class="bi bi-exclamation-triangle"></i> Failed to load dashboard data. 
        <br><small>${error.message}</small>
      </div>
    `;
  }
});
