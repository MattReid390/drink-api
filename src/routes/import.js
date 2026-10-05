const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const pool = require('../db/config');

const router = express.Router();

// Helper: Parse CSV string
function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));

    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx];
    });
    rows.push(row);
  }

  return rows;
}

// POST /api/import/csv - Import drinks from CSV
router.post('/csv', authMiddleware, async (req, res) => {
  try {
    const { csvContent } = req.body;

    if (!csvContent) {
      return res.status(400).json({ error: 'CSV content required' });
    }

    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No valid rows in CSV' });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const name = row.name || row.drink || '';
        const price = parseFloat(row.price) || null;
        const units = parseFloat(row.units) || 0;
        const venueName = row.venue || row.venue_name || 'Imported';

        if (!name || units <= 0) {
          errorCount++;
          errors.push(`Row ${i + 2}: Invalid drink name or units`);
          continue;
        }

        // Find or create venue
        let venueId = null;
        if (venueName) {
          const venueQuery = `
            SELECT id FROM venues WHERE name = $1 LIMIT 1;
          `;
          const venueResult = await pool.query(venueQuery, [venueName]);

          if (venueResult.rows.length === 0) {
            // Create new venue
            const createVenueQuery = `
              INSERT INTO venues (name, type, created_at)
              VALUES ($1, 'Imported', NOW())
              RETURNING id;
            `;
            const createResult = await pool.query(createVenueQuery, [venueName]);
            venueId = createResult.rows[0].id;
          } else {
            venueId = venueResult.rows[0].id;
          }
        }

        // Insert drink
        if (venueId) {
          const drinkQuery = `
            INSERT INTO drinks (venue_id, name, price, units, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id;
          `;
          await pool.query(drinkQuery, [venueId, name, price, units]);
          successCount++;
        }
      } catch (rowError) {
        errorCount++;
        errors.push(`Row ${i + 2}: ${rowError.message}`);
      }
    }

    res.status(successCount > 0 ? 200 : 400).json({
      message: 'Import completed',
      successCount,
      errorCount,
      totalRows: rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import CSV error:', error);
    res.status(500).json({ error: 'Failed to import CSV' });
  }
});

// POST /api/import/validate - Validate CSV format
router.post('/validate', authMiddleware, (req, res) => {
  try {
    const { csvContent } = req.body;

    if (!csvContent) {
      return res.status(400).json({ error: 'CSV content required' });
    }

    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No valid rows in CSV', isValid: false });
    }

    const issues = [];
    let validCount = 0;

    rows.forEach((row, idx) => {
      const name = row.name || row.drink || '';
      const units = parseFloat(row.units);

      if (!name) {
        issues.push(`Row ${idx + 2}: Missing drink name`);
      } else if (isNaN(units) || units <= 0) {
        issues.push(`Row ${idx + 2}: Invalid or missing units (must be > 0)`);
      } else {
        validCount++;
      }
    });

    res.json({
      isValid: issues.length === 0,
      totalRows: rows.length,
      validRows: validCount,
      issues: issues.length > 0 ? issues : undefined,
      expectedFormat: {
        requiredFields: ['name', 'units'],
        optionalFields: ['price', 'venue', 'date_logged'],
        exampleHeaders: 'name,units,price,venue',
      },
    });
  } catch (error) {
    console.error('Validate CSV error:', error);
    res.status(500).json({ error: 'Failed to validate CSV' });
  }
});

module.exports = router;
