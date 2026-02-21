const express = require('express');
const router = express.Router();
const { prepare } = require('../db/connection');

/**
 * Simple admin authentication middleware
 * For v1, uses a shared secret in headers
 */
const adminAuth = (req, res, next) => {
  const adminSecret = process.env.ADMIN_SECRET || 'kitchen-admin-2024';
  const providedSecret = req.headers['x-admin-secret'];

  if (!providedSecret || providedSecret !== adminSecret) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or missing admin secret' });
  }

  next();
};

/**
 * GET /api/admin/orders
 * Get all orders for a specific date
 * Query params: date (YYYY-MM-DD), status (optional)
 */
router.get('/orders', adminAuth, (req, res) => {
  try {
    const { date, status } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Valid date parameter required (YYYY-MM-DD)' });
    }

    // Validate status if provided
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: `Status must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Build query with optional status filter
    let query = `
      SELECT o.id, o.name, o.flat_number, o.requested_time, o.fulfilment_type,
             o.delivery_location, o.status, o.special_notes, o.created_at,
             sd.date as service_date, sd.service_start_time, sd.service_end_time
      FROM orders o
      JOIN service_days sd ON o.service_day_id = sd.id
      WHERE sd.date = ?
    `;
    const params = [date];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.requested_time ASC, o.created_at ASC';

    const orders = prepare(query).all(...params);

    // Fetch items for each order
    const ordersWithItems = orders.map(order => {
      const items = prepare(`
        SELECT oi.menu_item_id, oi.quantity, mi.name, mi.description, mi.category
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE oi.order_id = ?
      `).all(order.id);

      return { ...order, items };
    });

    res.json({
      success: true,
      data: ordersWithItems
    });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

/**
 * PATCH /api/admin/orders/:id/status
 * Update order status
 */
router.patch('/orders/:id/status', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: `Status must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Check if order exists
    const existingOrder = prepare('SELECT id FROM orders WHERE id = ?').get(id);
    if (!existingOrder) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Update status
    prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);

    // Fetch updated order
    const order = prepare(`
      SELECT o.id, o.name, o.flat_number, o.requested_time, o.fulfilment_type,
             o.delivery_location, o.status, o.special_notes, o.created_at
      FROM orders o
      WHERE o.id = ?
    `).get(id);

    const items = prepare(`
      SELECT oi.menu_item_id, oi.quantity, mi.name, mi.description, mi.category
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
    `).all(id);

    res.json({
      success: true,
      data: { ...order, items }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

/**
 * GET /api/admin/summary
 * Get item totals for a specific date (for prep)
 */
router.get('/summary', adminAuth, (req, res) => {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Valid date parameter required (YYYY-MM-DD)' });
    }

    // Get item totals excluding cancelled orders
    const itemTotals = prepare(`
      SELECT mi.id, mi.name, mi.category, SUM(oi.quantity) as total_quantity
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN service_days sd ON o.service_day_id = sd.id
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE sd.date = ? AND o.status != 'CANCELLED'
      GROUP BY mi.id
      ORDER BY 
        CASE mi.category
          WHEN 'main' THEN 1
          WHEN 'side' THEN 2
          WHEN 'drink' THEN 3
          ELSE 4
        END,
        mi.name
    `).all(date);

    // Get order counts by status
    const statusCounts = prepare(`
      SELECT o.status, COUNT(*) as count
      FROM orders o
      JOIN service_days sd ON o.service_day_id = sd.id
      WHERE sd.date = ?
      GROUP BY o.status
    `).all(date);

    // Get total orders
    const totalOrders = prepare(`
      SELECT COUNT(*) as total
      FROM orders o
      JOIN service_days sd ON o.service_day_id = sd.id
      WHERE sd.date = ?
    `).get(date);

    res.json({
      success: true,
      data: {
        date,
        item_totals: itemTotals,
        status_counts: statusCounts,
        total_orders: totalOrders.total
      }
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch summary' });
  }
});

/**
 * GET /api/admin/service-day/:date
 * Get or create service day for a specific date
 */
router.get('/service-day/:date', adminAuth, (req, res) => {
  try {
    const { date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Valid date required (YYYY-MM-DD)' });
    }

    let serviceDay = prepare('SELECT * FROM service_days WHERE date = ?').get(date);

    if (!serviceDay) {
      // Create new service day
      const insert = prepare(`
        INSERT INTO service_days (date, service_start_time, service_end_time, is_open)
        VALUES (?, '08:00', '11:00', 1)
      `);
      const result = insert.run(date);
      serviceDay = {
        id: result.lastInsertRowid,
        date,
        service_start_time: '08:00',
        service_end_time: '11:00',
        is_open: 1
      };
    }

    res.json({
      success: true,
      data: serviceDay
    });
  } catch (error) {
    console.error('Error fetching service day:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch service day' });
  }
});

/**
 * PATCH /api/admin/service-day/:date
 * Update service day settings (open/close, times)
 */
router.patch('/service-day/:date', adminAuth, (req, res) => {
  try {
    const { date } = req.params;
    const { is_open, service_start_time, service_end_time } = req.body;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Valid date required (YYYY-MM-DD)' });
    }

    // Validate times if provided
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (service_start_time && !timeRegex.test(service_start_time)) {
      return res.status(400).json({ success: false, error: 'Invalid service_start_time format (use HH:MM)' });
    }
    if (service_end_time && !timeRegex.test(service_end_time)) {
      return res.status(400).json({ success: false, error: 'Invalid service_end_time format (use HH:MM)' });
    }

    // Get or create service day
    let serviceDay = prepare('SELECT * FROM service_days WHERE date = ?').get(date);

    if (!serviceDay) {
      const insert = prepare(`
        INSERT INTO service_days (date, service_start_time, service_end_time, is_open)
        VALUES (?, ?, ?, ?)
      `);
      const result = insert.run(
        date,
        service_start_time || '08:00',
        service_end_time || '11:00',
        is_open !== undefined ? (is_open ? 1 : 0) : 1
      );
      serviceDay = {
        id: result.lastInsertRowid,
        date,
        service_start_time: service_start_time || '08:00',
        service_end_time: service_end_time || '11:00',
        is_open: is_open !== undefined ? (is_open ? 1 : 0) : 1
      };
    } else {
      // Update existing service day
      const updates = [];
      const values = [];

      if (is_open !== undefined) {
        updates.push('is_open = ?');
        values.push(is_open ? 1 : 0);
      }
      if (service_start_time) {
        updates.push('service_start_time = ?');
        values.push(service_start_time);
      }
      if (service_end_time) {
        updates.push('service_end_time = ?');
        values.push(service_end_time);
      }

      if (updates.length > 0) {
        values.push(date);
        prepare(`UPDATE service_days SET ${updates.join(', ')} WHERE date = ?`).run(...values);
      }

      serviceDay = prepare('SELECT * FROM service_days WHERE date = ?').get(date);
    }

    res.json({
      success: true,
      data: serviceDay
    });
  } catch (error) {
    console.error('Error updating service day:', error);
    res.status(500).json({ success: false, error: 'Failed to update service day' });
  }
});

module.exports = router;
