# Phase 6.1 Implementation Guide

**Objective:** Connect the Expo app to the Express API backend with real venue data

**Status:** Backend created, ready for database setup and testing

---

## Step-by-Step Setup

### Step 1: Database Setup (20 min)

**Option A: Local PostgreSQL (Recommended for Development)**

1. Install PostgreSQL:
   - Windows: Download from postgresql.org → Install
   - Mac: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql`

2. Start PostgreSQL service:
   ```bash
   # Windows (PowerShell as Admin)
   net start PostgreSQL

   # Mac
   brew services start postgresql

   # Linux
   sudo systemctl start postgresql
   ```

3. Create database:
   ```bash
   psql -U postgres -c "CREATE DATABASE drink_awareness;"
   ```

4. Verify connection:
   ```bash
   psql -U postgres -d drink_awareness
   # Type \q to exit
   ```

**Option B: Cloud PostgreSQL (For Production)**

Use Render.com or Supabase:
1. Create PostgreSQL database (free tier available)
2. Copy connection string
3. Update `.env`:
   ```
   DB_HOST=your-host.render.com
   DB_USER=your-user
   DB_PASSWORD=your-password
   DB_NAME=your-database
   ```

---

### Step 2: Seed Database with Venues (5 min)

```bash
cd C:\Users\matth\Documents\drink-api
npm run seed
```

**Expected output:**
```
✅ Database tables created successfully
🌱 Starting database seed...

📍 Adding: The Anchor
   ✓ Guinness Pint - £4.80
   ✓ Stella Artois Pint - £4.50
   ✓ Peroni Pint - £5.00
   ... (more drinks)

✅ Database seeded successfully!
📊 5 venues added
🍺 30 drinks added
```

---

### Step 3: Start API Server (5 min)

```bash
npm run dev
```

**Expected output:**
```
🍺 Drink API running on http://localhost:5000
📊 Health check: http://localhost:5000/health
🏘️  Venues: http://localhost:5000/api/venues
```

### Step 4: Test API Endpoints (10 min)

**Test 1: Health Check**
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{"status":"OK","timestamp":"2026-08-24T12:15:00.000Z"}
```

**Test 2: List All Venues**
```bash
curl http://localhost:5000/api/venues
```

Expected response:
```json
[
  {
    "id": 1,
    "name": "The Anchor",
    "type": "Pub",
    "address": "12 High Street, London EC1A 1BB",
    "phone": "020 7123 4567",
    "coordinates": {"latitude": 51.505, "longitude": -0.09}
  },
  ...
]
```

**Test 3: Get Venue with Drinks**
```bash
curl http://localhost:5000/api/venues/1
```

Expected response:
```json
{
  "id": 1,
  "name": "The Anchor",
  "type": "Pub",
  "address": "12 High Street, London EC1A 1BB",
  "phone": "020 7123 4567",
  "coordinates": {"latitude": 51.505, "longitude": -0.09},
  "hours": {
    "monday": "11:00-23:00",
    ...
  },
  "drinks": [
    {"id": 1, "name": "Guinness Pint", "price": 4.80, "units": 2.3},
    ...
  ]
}
```

---

## Step 5: Connect Expo App to API (15 min)

### Update Expo App Services

**File:** `DrinkAwarenessApp/src/services/venues.ts`

Replace the `PLACEHOLDER_VENUES` import with API calls:

```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export const getVenues = async (): Promise<Venue[]> => {
  try {
    const response = await fetch(`${API_URL}/api/venues`);
    if (!response.ok) throw new Error('Failed to fetch venues');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch venues:', error);
    // Fallback to empty array (handled by screen)
    return [];
  }
};

export const getVenueDetail = async (id: string): Promise<Venue | null> => {
  try {
    const response = await fetch(`${API_URL}/api/venues/${id}`);
    if (!response.ok) throw new Error('Venue not found');
    const data = await response.json();
    return {
      ...data,
      id: String(data.id), // Ensure string ID
    };
  } catch (error) {
    console.error('Failed to fetch venue:', error);
    return null;
  }
};
```

### Update Environment File

**File:** `DrinkAwarenessApp/.env.local`

Add or update:
```
EXPO_PUBLIC_API_URL=http://localhost:5000
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_key
```

### Update VenueListScreen (if needed)

**File:** `DrinkAwarenessApp/src/screens/VenueListScreen.tsx`

Add loading state and error handling:

```typescript
const [venues, setVenues] = useState<Venue[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useFocusEffect(
  useCallback(() => {
    const loadVenues = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getVenues();
        setVenues(data);
      } catch (err) {
        setError('Could not load venues');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadVenues();
  }, [])
);

// In render:
{loading && <ActivityIndicator />}
{error && <Text style={styles.error}>{error}</Text>}
{!loading && !error && <FlatList data={venues} ... />}
```

---

## Step 6: Test Full Integration (15 min)

1. **Start API:**
   ```bash
   cd C:\Users\matth\Documents\drink-api
   npm run dev
   ```

2. **Start Expo App (new terminal):**
   ```bash
   cd C:\Users\matth\Documents\DrinkAwarenessApp
   npm start
   ```

3. **Test in Simulator/Device:**
   - Open VenueListScreen
   - Verify venues load from API (should show The Anchor, The Crown, etc.)
   - Tap a venue
   - Verify venue detail shows real drinks
   - Check prices and units are correct

4. **Log a Drink:**
   - Log a drink from a real venue
   - Verify it appears in daily summary
   - Verify calculation uses real data

---

## Troubleshooting

**API won't start:**
```bash
# Check if port 5000 is in use
lsof -i :5000

# Kill process if needed
kill -9 <PID>

# Try different port
PORT=3000 npm run dev
```

**Database connection fails:**
```bash
# Test connection
psql -U postgres -d drink_awareness

# Check .env file
cat .env

# Verify PostgreSQL is running
pg_isready -h localhost
```

**Venues not loading in app:**
1. Check API is running: `curl http://localhost:5000/api/venues`
2. Check `.env` has correct `EXPO_PUBLIC_API_URL`
3. Check network error in console
4. For Android: use `http://10.0.2.2:5000` instead of localhost
5. For iOS: check firewall settings

**Different venues on different loads:**
- This shouldn't happen (seed is idempotent)
- Check database isn't being reset
- Verify only one API instance running

---

## Next Steps

### When Ready to Deploy

1. **Push API to GitHub:**
   ```bash
   cd C:\Users\matth\Documents\drink-api
   git remote add origin https://github.com/YOUR_USERNAME/drink-api.git
   git push -u origin main
   ```

2. **Deploy to Render.com:**
   - Connect GitHub repository
   - Add environment variables
   - Deploy (automatic on push)

3. **Update Expo App:**
   ```
   EXPO_PUBLIC_API_URL=https://drink-api-production.onrender.com
   ```

4. **Add More Venues:**
   - Edit `src/db/seed.js`
   - Add more pubs (copy template from existing ones)
   - Run `npm run seed` to refresh database

---

## Success Checklist

- [ ] PostgreSQL running locally
- [ ] Database created (drink_awareness)
- [ ] API server running on localhost:5000
- [ ] Health check passes
- [ ] All 5 venues load via `/api/venues`
- [ ] Venue detail loads drinks
- [ ] Expo app connects to API
- [ ] VenueListScreen shows real venues
- [ ] VenueDetailScreen shows real drinks
- [ ] Logging a drink works with real data
- [ ] Daily summary shows real price/units

---

## Timeline

**Day 1:** Database setup + seed data (30 min)  
**Day 2:** Test API endpoints (20 min)  
**Day 3:** Connect Expo app (20 min)  
**Day 4:** Test full integration (15 min)  
**Day 5:** Deploy to production (30 min)  

**Total:** ~2 hours of active work spread over 5 days

---

**Current Status:** ✅ API backend ready, awaiting database setup  
**Next:** Run through Step 1 (database setup)

