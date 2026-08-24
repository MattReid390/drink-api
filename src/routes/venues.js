const express = require('express');
const pool = require('../db/config');

const router = express.Router();

// GET /api/venues - List all venues
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, type, address, phone, latitude, longitude, monday_open, monday_close
       FROM venues
       ORDER BY name ASC`
    );

    const venues = result.rows.map((venue) => ({
      id: venue.id,
      name: venue.name,
      type: venue.type,
      address: venue.address,
      phone: venue.phone,
      coordinates: {
        latitude: parseFloat(venue.latitude),
        longitude: parseFloat(venue.longitude),
      },
      distance: 0, // Will be calculated by client if needed
    }));

    res.json(venues);
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// GET /api/venues/:id - Get venue with drink menu
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Get venue details
    const venueResult = await pool.query(
      `SELECT id, name, type, address, phone, latitude, longitude, monday_open, monday_close
       FROM venues
       WHERE id = $1`,
      [id]
    );

    if (venueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const venue = venueResult.rows[0];

    // Get drinks for this venue
    const drinksResult = await pool.query(
      `SELECT id, name, price, units
       FROM drinks
       WHERE venue_id = $1
       ORDER BY name ASC`,
      [id]
    );

    const drinks = drinksResult.rows.map((drink) => ({
      id: drink.id,
      name: drink.name,
      price: parseFloat(drink.price),
      units: parseFloat(drink.units),
    }));

    res.json({
      id: venue.id,
      name: venue.name,
      type: venue.type,
      address: venue.address,
      phone: venue.phone,
      coordinates: {
        latitude: parseFloat(venue.latitude),
        longitude: parseFloat(venue.longitude),
      },
      hours: {
        monday: `${venue.monday_open}-${venue.monday_close}`,
        tuesday: `${venue.monday_open}-${venue.monday_close}`,
        wednesday: `${venue.monday_open}-${venue.monday_close}`,
        thursday: `${venue.monday_open}-${venue.monday_close}`,
        friday: `${venue.monday_open}-${venue.monday_close}`,
        saturday: `${venue.monday_open}-${venue.monday_close}`,
        sunday: `${venue.monday_open}-${venue.monday_close}`,
      },
      drinks,
    });
  } catch (error) {
    console.error('Error fetching venue:', error);
    res.status(500).json({ error: 'Failed to fetch venue details' });
  }
});

// POST /api/venues/search - Search venues by name or type
router.post('/search', async (req, res) => {
  const { query, type } = req.body;

  try {
    let sql = `SELECT id, name, type, address, phone, latitude, longitude
               FROM venues WHERE 1=1`;
    const params = [];

    if (query) {
      sql += ` AND (name ILIKE $${params.length + 1} OR address ILIKE $${params.length + 1})`;
      params.push(`%${query}%`);
    }

    if (type) {
      sql += ` AND type ILIKE $${params.length + 1}`;
      params.push(`%${type}%`);
    }

    sql += ` ORDER BY name ASC`;

    const result = await pool.query(sql, params);

    const venues = result.rows.map((venue) => ({
      id: venue.id,
      name: venue.name,
      type: venue.type,
      address: venue.address,
      phone: venue.phone,
      coordinates: {
        latitude: parseFloat(venue.latitude),
        longitude: parseFloat(venue.longitude),
      },
    }));

    res.json(venues);
  } catch (error) {
    console.error('Error searching venues:', error);
    res.status(500).json({ error: 'Failed to search venues' });
  }
});

module.exports = router;
