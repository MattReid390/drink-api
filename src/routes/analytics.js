const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const pool = require('../db/config');

const router = express.Router();

// GET /api/analytics/trends - Get 30-day trend data
router.get('/trends', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT
        CAST(DATE(created_at) AS VARCHAR) as date,
        COUNT(*) as drinks,
        COALESCE(SUM(units), 0) as units
      FROM drinks
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC;
    `;

    const result = await pool.query(query);
    const trends = result.rows.map(row => ({
      date: row.date,
      drinks: parseInt(row.drinks),
      units: parseFloat(row.units),
    }));

    res.json({
      period: '30_days',
      dataPoints: trends.length,
      totalDrinks: trends.reduce((sum, d) => sum + d.drinks, 0),
      totalUnits: trends.reduce((sum, d) => sum + d.units, 0),
      trends,
    });
  } catch (error) {
    console.error('Analytics trends error:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// GET /api/analytics/stats - Get overall statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const allTimeQuery = `
      SELECT
        COUNT(*) as total_drinks,
        COALESCE(SUM(units), 0) as total_units,
        ROUND(AVG(units)::numeric, 2) as avg_units,
        MAX(units) as max_units,
        MIN(units) as min_units
      FROM drinks;
    `;

    const thirtyDayQuery = `
      SELECT
        COUNT(*) as drinks_30d,
        COALESCE(SUM(units), 0) as units_30d,
        COUNT(DISTINCT DATE(created_at)) as active_days_30d
      FROM drinks
      WHERE created_at >= NOW() - INTERVAL '30 days';
    `;

    const allTimeResult = await pool.query(allTimeQuery);
    const thirtyDayResult = await pool.query(thirtyDayQuery);

    const allTime = allTimeResult.rows[0];
    const thirtyDay = thirtyDayResult.rows[0];

    res.json({
      allTime: {
        totalDrinks: parseInt(allTime.total_drinks),
        totalUnits: parseFloat(allTime.total_units),
        averageUnits: parseFloat(allTime.avg_units || 0),
        maxUnits: parseFloat(allTime.max_units || 0),
        minUnits: parseFloat(allTime.min_units || 0),
      },
      thirtyDays: {
        drinks: parseInt(thirtyDay.drinks_30d),
        units: parseFloat(thirtyDay.units_30d),
        activeDays: parseInt(thirtyDay.active_days_30d),
        averagePerDay: thirtyDay.active_days_30d > 0
          ? parseFloat((thirtyDay.units_30d / thirtyDay.active_days_30d).toFixed(2))
          : 0,
      },
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/analytics/insights - Get insights based on data
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    const insightsQuery = `
      WITH daily_stats AS (
        SELECT
          DATE(created_at) as day,
          SUM(units) as daily_units,
          COUNT(*) as daily_drinks
        FROM drinks
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
      )
      SELECT
        (SELECT COUNT(*) FROM daily_stats) as days_logged_30d,
        (SELECT AVG(daily_units) FROM daily_stats) as avg_daily_units,
        (SELECT MAX(daily_units) FROM daily_stats) as peak_daily_units
    `;

    const result = await pool.query(insightsQuery);
    const data = result.rows[0];

    const insights = [];

    if (data.days_logged_30d > 0) {
      if (data.avg_daily_units > 14) {
        insights.push({
          type: 'warning',
          message: `Average daily intake (${parseFloat(data.avg_daily_units).toFixed(1)} units) exceeds the recommended limit of 14 units.`,
        });
      }

      if (data.peak_daily_units > 21) {
        insights.push({
          type: 'warning',
          message: `Peak consumption was ${parseFloat(data.peak_daily_units).toFixed(1)} units.`,
        });
      }

      if (data.days_logged_30d >= 25) {
        insights.push({
          type: 'positive',
          message: 'Great consistency logging your drinks regularly!',
        });
      }

      if (data.avg_daily_units <= 14) {
        insights.push({
          type: 'positive',
          message: 'Your average daily intake is within healthy limits!',
        });
      }
    } else {
      insights.push({
        type: 'info',
        message: 'Start logging drinks to get insights.',
      });
    }

    res.json({
      insightCount: insights.length,
      insights,
      metadata: {
        daysLogged: parseInt(data.days_logged_30d || 0),
        averageDailyUnits: parseFloat(data.avg_daily_units || 0).toFixed(1),
        peakDailyUnits: parseFloat(data.peak_daily_units || 0).toFixed(1),
      },
    });
  } catch (error) {
    console.error('Analytics insights error:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

module.exports = router;
