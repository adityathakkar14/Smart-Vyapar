export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Generate last 7 days dates
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const revenue = i === 0 ? 1250 : Math.floor(Math.random() * 2000 + 500);
    trend.push({ date: d, revenue: revenue });
  }

  const data = {
    status: 'success',
    data: {
      todayRevenue: 1250.0,
      revenueTrend: trend,
      topItems: [
        { item_name: 'Rice (5kg)', count: 24 },
        { item_name: 'Sugar (1kg)', count: 18 },
        { item_name: 'Tea Powder (500g)', count: 14 },
        { item_name: 'Cooking Oil (1L)', count: 10 },
        { item_name: 'Wheat Flour (10kg)', count: 8 }
      ],
      recentInvoices: [
        { invoice_id: 1004, customer_name: 'Aditya Thakkar', total_amount: 450.0, date_created: new Date().toISOString() },
        { invoice_id: 1003, customer_name: 'Rajesh Kumar', total_amount: 320.0, date_created: new Date(Date.now() - 3600000).toISOString() },
        { invoice_id: 1002, customer_name: 'Pooja Patel', total_amount: 680.0, date_created: new Date(Date.now() - 7200000).toISOString() },
        { invoice_id: 1001, customer_name: 'Cash Customer', total_amount: 150.0, date_created: new Date(Date.now() - 14400000).toISOString() }
      ]
    }
  };

  res.status(200).json(data);
}
