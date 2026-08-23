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

  try {
    // Attempt to fetch Analytics Data from PHP server
    const response = await fetch('../server/api/analytics.php');
    if (response.ok) {
      const result = await response.json();
      if (result.status === 'success' && result.data) {
        data = result.data;
      }
    }
  } catch (err) {
    console.warn("Server analytics API not reachable, loading local storage data:", err);
  }

  // Fallback to LocalStorage / Offline data (for Vercel deployment & offline PWA)
  if (!data) {
    data = loadLocalAnalytics();
  }

  renderDashboard(data);

  function loadLocalAnalytics() {
    const rawInvoices = JSON.parse(localStorage.getItem('smart_vyapar_invoices') || '[]');
    
    // Seed default sample data if totally empty
    const seedInvoices = rawInvoices.length > 0 ? rawInvoices : [
      { invoice_id: 1003, customer_name: 'Aditya Thakkar', total_amount: 450, date_created: new Date().toISOString(), items: [{ name: 'Rice 5kg', qty: 1, price: 300 }, { name: 'Sugar 2kg', qty: 2, price: 75 }] },
      { invoice_id: 1002, customer_name: 'Rajesh Kumar', total_amount: 180, date_created: new Date(Date.now() - 86400000).toISOString(), items: [{ name: 'Tea 500g', qty: 1, price: 180 }] },
      { invoice_id: 1001, customer_name: 'Pooja Patel', total_amount: 620, date_created: new Date(Date.now() - 172800000).toISOString(), items: [{ name: 'Oil 1L', qty: 2, price: 160 }, { name: 'Wheat Flour 5kg', qty: 1, price: 300 }] }
    ];

    const todayStr = new Date().toISOString().slice(0, 10);
    let todayRevenue = 0;
    const itemMap = {};
    const trendMap = {};

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      trendMap[d] = 0;
    }

    seedInvoices.forEach(inv => {
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
      topItems: topItems.length ? topItems : [{ item_name: 'Rice', count: 12 }, { item_name: 'Sugar', count: 8 }, { item_name: 'Tea', count: 5 }],
      recentInvoices: seedInvoices.slice(0, 10)
    };
  }

  function renderDashboard(data) {
    // 1. Render Today's Revenue
    todayRevenueEl.textContent = formatCurrency(data.todayRevenue);

    // 2. Render Revenue Trend Chart (Line Chart)
    const trendCtx = document.getElementById('revenueTrendChart')?.getContext('2d');
    if (trendCtx) {
      const trendDates = data.revenueTrend.map(d => d.date);
      const trendAmounts = data.revenueTrend.map(d => parseFloat(d.revenue));
      
      new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: trendDates.length ? trendDates : ['Today'],
          datasets: [{
            label: 'Revenue (₹)',
            data: trendAmounts.length ? trendAmounts : [data.todayRevenue],
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
    }

    // 4. Render Recent Invoices Table
    if (!data.recentInvoices || data.recentInvoices.length === 0) {
      tbodyEl.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">No recent invoices</td></tr>`;
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
  }
});
