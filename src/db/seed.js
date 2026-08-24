const pool = require('./config');
const { createTables } = require('./schema');

const venues = [
  {
    name: 'The Anchor',
    type: 'Pub',
    address: '12 High Street, London EC1A 1BB',
    phone: '020 7123 4567',
    latitude: 51.505,
    longitude: -0.09,
    hours: {
      monday: '11:00-23:00',
      tuesday: '11:00-23:00',
      wednesday: '11:00-23:00',
      thursday: '11:00-23:00',
      friday: '11:00-00:00',
      saturday: '11:00-00:00',
      sunday: '12:00-22:30',
    },
    drinks: [
      { name: 'Guinness Pint', price: 4.80, units: 2.3 },
      { name: 'Stella Artois Pint', price: 4.50, units: 2.3 },
      { name: 'Peroni Pint', price: 5.00, units: 2.3 },
      { name: 'House Wine Glass', price: 5.50, units: 2.1 },
      { name: 'Gin & Tonic', price: 6.00, units: 1.4 },
      { name: 'Vodka Shot', price: 3.50, units: 1.0 },
    ],
  },
  {
    name: 'The Crown',
    type: 'Pub',
    address: '45 Market Square, London EC1A 2AB',
    phone: '020 7456 7890',
    latitude: 51.507,
    longitude: -0.087,
    hours: {
      monday: '12:00-23:00',
      tuesday: '12:00-23:00',
      wednesday: '12:00-23:00',
      thursday: '12:00-23:00',
      friday: '12:00-01:00',
      saturday: '12:00-01:00',
      sunday: '12:00-23:00',
    },
    drinks: [
      { name: 'Cider Pint', price: 4.20, units: 2.6 },
      { name: 'Lager Pint', price: 4.50, units: 2.3 },
      { name: 'Ale Pint', price: 4.80, units: 2.3 },
      { name: 'White Wine Glass', price: 5.50, units: 2.1 },
      { name: 'Whiskey Shot', price: 4.00, units: 1.0 },
      { name: 'Rum & Coke', price: 5.50, units: 1.5 },
    ],
  },
  {
    name: 'Neon Bar',
    type: 'Bar',
    address: '8 Canal Street, London EC1A 3CD',
    phone: '020 7789 0123',
    latitude: 51.503,
    longitude: -0.093,
    hours: {
      monday: '17:00-23:00',
      tuesday: '17:00-23:00',
      wednesday: '17:00-23:00',
      thursday: '17:00-01:00',
      friday: '17:00-02:00',
      saturday: '18:00-02:00',
      sunday: '18:00-23:00',
    },
    drinks: [
      { name: 'Mojito', price: 7.50, units: 1.5 },
      { name: 'Margarita', price: 8.00, units: 1.6 },
      { name: 'Old Fashioned', price: 8.50, units: 1.8 },
      { name: 'Cosmopolitan', price: 7.50, units: 1.4 },
      { name: 'Vodka Shot', price: 3.50, units: 1.0 },
      { name: 'Beer on Tap', price: 5.00, units: 2.3 },
    ],
  },
  {
    name: 'The Rose & Crown',
    type: 'Traditional Pub',
    address: '123 Brick Lane, London E1 6QL',
    phone: '020 7247 9999',
    latitude: 51.52,
    longitude: -0.072,
    hours: {
      monday: '11:00-23:00',
      tuesday: '11:00-23:00',
      wednesday: '11:00-23:00',
      thursday: '11:00-23:00',
      friday: '11:00-00:00',
      saturday: '11:00-00:00',
      sunday: '12:00-22:30',
    },
    drinks: [
      { name: 'Timothy Taylor Pint', price: 5.20, units: 2.3 },
      { name: 'London Pride Pint', price: 4.80, units: 2.3 },
      { name: 'Fuller\'s ESB Pint', price: 5.50, units: 2.3 },
      { name: 'Red Wine Glass', price: 6.00, units: 2.1 },
      { name: 'Pint of Cider', price: 4.50, units: 2.6 },
      { name: 'Brandy Shot', price: 4.50, units: 1.0 },
    ],
  },
  {
    name: 'The Vintage Bar',
    type: 'Wine Bar',
    address: '56 Covent Garden, London WC2E 8RF',
    phone: '020 7836 5555',
    latitude: 51.512,
    longitude: -0.122,
    hours: {
      monday: '11:00-23:00',
      tuesday: '11:00-23:00',
      wednesday: '11:00-23:00',
      thursday: '11:00-23:00',
      friday: '11:00-00:00',
      saturday: '11:00-00:00',
      sunday: '12:00-22:00',
    },
    drinks: [
      { name: 'Pinot Grigio Glass', price: 6.50, units: 2.1 },
      { name: 'Bordeaux Glass', price: 7.00, units: 2.1 },
      { name: 'Prosecco Glass', price: 6.00, units: 1.8 },
      { name: 'Champagne Flute', price: 8.00, units: 1.8 },
      { name: 'House Red Carafe', price: 18.00, units: 9.0 },
      { name: 'House White Carafe', price: 16.50, units: 9.0 },
    ],
  },
];

async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting database seed...\n');

    // Create tables
    await createTables();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await client.query('DELETE FROM drinks');
    await client.query('DELETE FROM venues');
    await client.query('ALTER SEQUENCE venues_id_seq RESTART WITH 1');

    // Insert venues and drinks
    for (const venue of venues) {
      console.log(`\n📍 Adding: ${venue.name}`);

      // Parse hours
      const hoursMap = {
        monday: 'monday',
        tuesday: 'tuesday',
        wednesday: 'wednesday',
        thursday: 'thursday',
        friday: 'friday',
        saturday: 'saturday',
        sunday: 'sunday',
      };

      const [openTime, closeTime] = venue.hours.monday.split('-');

      // Insert venue
      const venueResult = await client.query(
        `INSERT INTO venues (name, type, address, phone, latitude, longitude, monday_open, monday_close)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          venue.name,
          venue.type,
          venue.address,
          venue.phone,
          venue.latitude,
          venue.longitude,
          openTime,
          closeTime,
        ]
      );

      const venueId = venueResult.rows[0].id;

      // Insert drinks
      for (const drink of venue.drinks) {
        await client.query(
          `INSERT INTO drinks (venue_id, name, price, units)
           VALUES ($1, $2, $3, $4)`,
          [venueId, drink.name, drink.price, drink.units]
        );
        console.log(`   ✓ ${drink.name} - £${drink.price.toFixed(2)}`);
      }
    }

    console.log('\n✅ Database seeded successfully!');
    console.log(`📊 ${venues.length} venues added`);
    const totalDrinks = venues.reduce((sum, v) => sum + v.drinks.length, 0);
    console.log(`🍺 ${totalDrinks} drinks added`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seed
seedDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
