document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('dashboard-loading');
  const contentEl = document.getElementById('dashboard-content');
  const todayRevenueEl = document.getElementById('today-revenue');
  const tbodyEl = document.getElementById('recent-invoices-tbody');

  // Format currency helper
  const formatCurrency = (amount) => '₹' + parseFloat(amount || 0).toFixed(2);
  
  // Theme colors
  const primaryTeal = '#0F4C5C';
  const accentSaffron = '#F3722C';
  const pieColors = ['#0F4C5C', '#F3722C', '#2a9d8f', '#e9c46a', '#e76f51'];

  let data = null;

  // Try fetching from the server API first
  const apiEndpoints = [
    '../server/api/analytics.php',
    'server/api/analytics.php',
    '/api/analytics'
  ];

  for (const endpoint of apiEndpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const result = await response.json();
          if (result && result.status === 'success' && result.data) {
            data = result.data;
            console.log(`[Dashboard] Analytics loaded from server: ${endpoint}`);
            break;
          }
        }
      }
    } catch (err) {
      // Continue to next endpoint or fallback
    }
  }

  // If server is not reachable, calculate from real locally saved invoices (or show 0/empty state)
  if (!data) {
    console.log("[Dashboard] Server API not reachable, reading local invoices");
    data = loadLocalAnalytics();
  }

  renderDashboard(data);

  // Helper to calculate analytics from real user-saved invoices (or empty state)
  function loadLocalAnalytics() {
    let invoices = [];
    try {
      invoices = JSON.parse(localStorage.getItem('smart_vyapar_invoices') || '[]');
    } catch (e) {
      invoices = [];
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    let todayRevenue = 0;
    const itemMap = {};
    const trendMap = {};

    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      trendMap[d] = 0;
    }

    invoices.forEach(inv => {
      const invDate = (inv.date_created || '').slice(0, 10);
      const amt = parseFloat(inv.total_amount || 0);

      if (invDate === todayStr) {
        todayRevenue += amt;
      }
      if (trendMap.hasOwnProperty(invDate)) {
        trendMap[invDate] += amt;
      } else {
        trendMap[invDate] = amt;
      }

      if (Array.isArray(inv.items)) {
        inv.items.forEach(item => {
          const name = item.name || 'Item';
          itemMap[name] = (itemMap[name] || 0) + (parseInt(item.qty) || 1);
        });
      }
    });

    const revenueTrend = Object.keys(trendMap).sort().map(d => ({ date: d, revenue: trendMap[d] }));
    const topItems = Object.keys(itemMap).map(k => ({ item_name: k, count: itemMap[k] })).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      todayRevenue,
      revenueTrend,
      topItems,
      recentInvoices: invoices.slice(0, 10)
    };
  }

  function renderDashboard(data) {
    try {
      // 1. Render Today's Revenue
      todayRevenueEl.textContent = formatCurrency(data.todayRevenue);

      // 2. Render Revenue Trend Chart (Line Chart)
      const trendCtx = document.getElementById('revenueTrendChart')?.getContext('2d');
      if (trendCtx) {
        const trendDates = (data.revenueTrend || []).map(d => d.date);
        const trendAmounts = (data.revenueTrend || []).map(d => parseFloat(d.revenue || 0));
        
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
      }

      // 3. Render Top Items Chart (Doughnut)
      const topCtx = document.getElementById('topItemsChart')?.getContext('2d');
      if (topCtx) {
        const hasItems = data.topItems && data.topItems.length > 0;
        const itemLabels = hasItems ? data.topItems.map(i => i.item_name) : ['No sales yet'];
        const itemCounts = hasItems ? data.topItems.map(i => parseInt(i.count)) : [1];
        const chartColors = hasItems ? pieColors : ['#e0e0e0'];
        
        new Chart(topCtx, {
          type: 'doughnut',
          data: {
            labels: itemLabels,
            datasets: [{
              data: itemCounts,
              backgroundColor: chartColors,
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
      }

      // 4. Render Recent Invoices Table
      if (!data.recentInvoices || data.recentInvoices.length === 0) {
        tbodyEl.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4"><i class="bi bi-receipt me-1"></i> No recent invoices recorded yet.</td></tr>`;
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
    } catch (renderErr) {
      console.error("Render Error:", renderErr);
      loadingEl.innerHTML = `<div class="alert alert-warning">Dashboard loaded with partial data.</div>`;
    }
  }
});
