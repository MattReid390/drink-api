# Drink Awareness API

REST API backend for the Drink Awareness app. Provides venue and drink menu data.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Set Up PostgreSQL Database

**Option A: Local PostgreSQL**
```bash
# Create database
createdb drink_awareness

# Create user (if needed)
psql -U postgres -c "CREATE USER postgres WITH PASSWORD 'postgres';"
```

**Option B: Cloud PostgreSQL (Supabase/Render)**
```bash
# Copy connection string to .env
DB_HOST=your-host
DB_USER=your-user
DB_PASSWORD=your-password
DB_NAME=your-database
```

### 4. Seed Database
```bash
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```

Server runs on http://localhost:5000

## API Endpoints

### List All Venues
```
GET /api/venues
```

Returns array of all venues with basic info:
```json
[
  {
    "id": 1,
    "name": "The Anchor",
    "type": "Pub",
    "address": "12 High Street, London EC1A 1BB",
    "phone": "020 7123 4567",
    "coordinates": {
      "latitude": 51.505,
      "longitude": -0.09
    }
  }
]
```

### Get Venue with Drinks
```
GET /api/venues/:id
```

Returns venue detail including full drink menu:
```json
{
  "id": 1,
  "name": "The Anchor",
  "type": "Pub",
  "address": "12 High Street, London EC1A 1BB",
  "phone": "020 7123 4567",
  "coordinates": { "latitude": 51.505, "longitude": -0.09 },
  "hours": {
    "monday": "11:00-23:00",
    "tuesday": "11:00-23:00",
    ...
  },
  "drinks": [
    { "id": 1, "name": "Guinness Pint", "price": 4.80, "units": 2.3 },
    { "id": 2, "name": "Stella Pint", "price": 4.50, "units": 2.3 }
  ]
}
```

### Search Venues
```
POST /api/venues/search
Content-Type: application/json

{
  "query": "anchor",
  "type": "Pub"
}
```

### Health Check
```
GET /health
```

## Database Schema

### Venues Table
- `id` (PRIMARY KEY)
- `name` (VARCHAR 255)
- `type` (VARCHAR 100)
- `address` (VARCHAR 500)
- `phone` (VARCHAR 20)
- `latitude`, `longitude` (DECIMAL)
- `monday_open` to `sunday_close` (TIME)

### Drinks Table
- `id` (PRIMARY KEY)
- `venue_id` (FOREIGN KEY)
- `name` (VARCHAR 255)
- `price` (DECIMAL 10,2)
- `units` (DECIMAL 10,2)

## Deployment

### Deploy to Render.com

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/drink-api.git
git push -u origin main
```

2. Create Render service:
   - Go to render.com
   - New → PostgreSQL
   - New → Web Service (connect GitHub)
   - Set environment variables (from .env)
   - Deploy

3. Update Expo App
```javascript
// In Expo app, change API URL to:
const API_URL = 'https://drink-api-production.onrender.com';
```

## Development

### Add New Venue
Edit `src/db/seed.js` and run `npm run seed`

### Add New Endpoint
Create route file in `src/routes/` and import in `src/server.js`

### Database Migrations
Add new tables/columns to `src/db/schema.js`

## Troubleshooting

**Can't connect to database:**
- Check .env credentials
- Verify PostgreSQL is running
- Test connection: `psql -U postgres -h localhost -d drink_awareness`

**Port already in use:**
- Change PORT in .env
- Or kill process: `lsof -ti:5000 | xargs kill -9`

**Seed data not loading:**
- Drop tables: `npm run seed` (it clears first)
- Check database connection

## Next Steps

- [ ] Add user authentication
- [ ] Add drink logging endpoint (POST /api/drinks/log)
- [ ] Add venue ratings/reviews
- [ ] Expand venue data (more cities)
- [ ] Add caching for performance

---

**Part of:** Drink Awareness App (Phase 6.1)  
**Created:** August 2026
