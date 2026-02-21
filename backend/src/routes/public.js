const express = require('express');
const router = express.Router();
const { prepare } = require('../db/connection');

/**
 * GET /api/service-day/today
 * Returns service window and is_open flag for today
 */
router.get('/today', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    let serviceDay = prepare(`
      SELECT id, date, service_start_time, service_end_time, is_open
      FROM service_days
      WHERE date = ?
    `).get(today);

    // If no service day exists for today, create one automatically
    if (!serviceDay) {
      const insert = prepare(`
        INSERT INTO service_days (date, service_start_time, service_end_time, is_open)
        VALUES (?, '08:00', '11:00', 1)
      `);
      const result = insert.run(today);
      serviceDay = {
        id: result.lastInsertRowid,
        date: today,
        service_start_time: '08:00',
        service_end_time: '11:00',
        is_open: 1
      };
    }

    res.json({
      success: true,
      data: {
        id: serviceDay.id,
        date: serviceDay.date,
        service_start_time: serviceDay.service_start_time,
        service_end_time: serviceDay.service_end_time,
        is_open: !!serviceDay.is_open
      }
    });
  } catch (error) {
    console.error('Error fetching service day:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch service day' });
  }
});

module.exports = router;
