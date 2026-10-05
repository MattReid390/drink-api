const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const pool = require('../db/config');

const router = express.Router();

// GET /api/export/csv - Export drinks as CSV
router.get('/csv', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT
        d.id,
        d.name,
        d.price,
        d.units,
        v.name as venue_name,
        TO_CHAR(d.created_at, 'YYYY-MM-DD HH:MI:SS') as date_logged
      FROM drinks d
      LEFT JOIN venues v ON d.venue_id = v.id
      ORDER BY d.created_at DESC;
    `;

    const result = await pool.query(query);
    const drinks = result.rows;

    if (drinks.length === 0) {
      return res.json({ message: 'No drinks to export' });
    }

    // Build CSV content
    const headers = ['ID', 'Name', 'Price (£)', 'Units', 'Venue', 'Date Logged'];
    const rows = drinks.map(d => [
      d.id,
      `"${d.name}"`,
      d.price || 'N/A',
      d.units,
      `"${d.venue_name || 'N/A'}"`,
      d.date_logged,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="drinks-export-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// GET /api/export/json - Export drinks as JSON
router.get('/json', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT
        d.id,
        d.name,
        d.price,
        d.units,
        v.name as venue_name,
        d.created_at
      FROM drinks d
      LEFT JOIN venues v ON d.venue_id = v.id
      ORDER BY d.created_at DESC;
    `;

    const result = await pool.query(query);
    const drinks = result.rows;

    const exportData = {
      exportDate: new Date().toISOString(),
      drinkCount: drinks.length,
      totalUnits: drinks.reduce((sum, d) => sum + parseFloat(d.units || 0), 0),
      drinks: drinks.map(d => ({
        id: d.id,
        name: d.name,
        price: parseFloat(d.price || 0),
        units: parseFloat(d.units),
        venue: d.venue_name,
        loggedAt: d.created_at,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="drinks-export-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export JSON error:', error);
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

// POST /api/export/report - Generate text report
router.post('/report', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    let query = `
      SELECT
        d.id,
        d.name,
        d.units,
        v.name as venue_name,
        d.created_at
      FROM drinks d
      LEFT JOIN venues v ON d.venue_id = v.id
      WHERE 1=1
    `;

    const params = [];

    if (startDate) {
      query += ` AND d.created_at >= $${params.length + 1}`;
      params.push(new Date(startDate));
    }

    if (endDate) {
      query += ` AND d.created_at <= $${params.length + 1}`;
      params.push(new Date(endDate));
    }

    query += ` ORDER BY d.created_at DESC;`;

    const result = await pool.query(query, params);
    const drinks = result.rows;

    const totalUnits = drinks.reduce((sum, d) => sum + parseFloat(d.units || 0), 0);
    const totalDrinks = drinks.length;
    const avgUnitsPerDrink = totalDrinks > 0 ? (totalUnits / totalDrinks).toFixed(2) : 0;

    const report = `
DRINK AWARENESS APP - EXPORT REPORT
Generated: ${new Date().toISOString()}
${startDate ? `Period: ${startDate} to ${endDate}` : 'All Time'}

SUMMARY
-------
Total Drinks: ${totalDrinks}
Total Units: ${totalUnits.toFixed(1)}
Average Units per Drink: ${avgUnitsPerDrink}

BREAKDOWN BY VENUE
------------------
${drinks.length === 0 ? 'No drinks logged' : Object.entries(
  drinks.reduce((acc, d) => {
    if (!acc[d.venue_name]) {
      acc[d.venue_name] = { count: 0, units: 0 };
    }
    acc[d.venue_name].count++;
    acc[d.venue_name].units += parseFloat(d.units || 0);
    return acc;
  }, {})
).map(([venue, data]) => `${venue}: ${data.count} drinks (${data.units.toFixed(1)} units)`).join('\n')}

RECENT DRINKS
-------------
${drinks.slice(0, 20).map(d => `${d.name} (${d.units} units) @ ${d.venue_name} - ${new Date(d.created_at).toLocaleDateString()}`).join('\n')}
`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="drinks-report-${Date.now()}.txt"`);
    res.send(report);
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
