const express = require('express');
const router = express.Router();
const { prepare, saveDb } = require('../db/connection');

/**
 * Validate order request
 */
const validateOrder = (req, res, next) => {
  const { name, flat_number, requested_time, fulfilment_type, items } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }

  if (!flat_number || typeof flat_number !== 'string' || flat_number.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Flat number is required' });
  }

  if (!requested_time || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(requested_time)) {
    return res.status(400).json({ success: false, error: 'Valid requested time is required (HH:MM format)' });
  }

  const validFulfilmentTypes = ['DELIVERY', 'COLLECTION', 'EAT_IN'];
  if (!fulfilment_type || !validFulfilmentTypes.includes(fulfilment_type)) {
    return res.status(400).json({ 
      success: false, 
      error: `Fulfilment type must be one of: ${validFulfilmentTypes.join(', ')}` 
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one item is required' });
  }

  for (const item of items) {
    if (!item.menu_item_id || typeof item.menu_item_id !== 'number') {
      return res.status(400).json({ success: false, error: 'Each item must have a valid menu_item_id' });
    }
    if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
      return res.status(400).json({ success: false, error: 'Each item must have a valid quantity (minimum 1)' });
    }
  }

  next();
};

/**
 * POST /api/orders
 * Create a new order
 */
router.post('/', validateOrder, (req, res) => {
  try {
    const { name, flat_number, requested_time, fulfilment_type, delivery_location, special_notes, items } = req.body;

    // Get today's service day
    const today = new Date().toISOString().split('T')[0];
    let serviceDay = prepare('SELECT * FROM service_days WHERE date = ?').get(today);

    // Create service day if it doesn't exist
    if (!serviceDay) {
      const insert = prepare(`
        INSERT INTO service_days (date, service_start_time, service_end_time, is_open)
        VALUES (?, '08:00', '11:00', 1)
      `);
      const result = insert.run(today);
      serviceDay = { id: result.lastInsertRowid, service_start_time: '08:00', service_end_time: '11:00', is_open: 1 };
    }

    // Check if service is open
    if (!serviceDay.is_open) {
      return res.status(400).json({ success: false, error: 'Service is not open today' });
    }

    // Validate requested time is within service window
    const [reqHour, reqMin] = requested_time.split(':').map(Number);
    const [startHour, startMin] = serviceDay.service_start_time.split(':').map(Number);
    const [endHour, endMin] = serviceDay.service_end_time.split(':').map(Number);

    const reqMinutes = reqHour * 60 + reqMin;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (reqMinutes < startMinutes || reqMinutes > endMinutes) {
      return res.status(400).json({ 
        success: false, 
        error: `Requested time must be between ${serviceDay.service_start_time} and ${serviceDay.service_end_time}` 
      });
    }

    // Validate all menu items exist
    for (const item of items) {
      const menuItem = prepare('SELECT id FROM menu_items WHERE id = ? AND is_active = 1').get(item.menu_item_id);
      if (!menuItem) {
        return res.status(400).json({ success: false, error: `Menu item with id ${item.menu_item_id} not found or inactive` });
      }
    }

    // Create the order
    const insertOrder = prepare(`
      INSERT INTO orders (name, flat_number, service_day_id, requested_time, fulfilment_type, delivery_location, special_notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `);

    const orderResult = insertOrder.run(
      name.trim(),
      flat_number.trim(),
      serviceDay.id,
      requested_time,
      fulfilment_type,
      delivery_location?.trim() || null,
      special_notes?.trim() || null
    );

    const orderId = orderResult.lastInsertRowid;

    // Insert order items
    const insertOrderItem = prepare(`
      INSERT INTO order_items (order_id, menu_item_id, quantity)
      VALUES (?, ?, ?)
    `);

    for (const item of items) {
      insertOrderItem.run(orderId, item.menu_item_id, item.quantity);
    }

    // Save to disk
    saveDb();

    // Fetch the created order with items
    const order = prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    
    if (!order) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve created order' });
    }

    const orderItems = prepare(`
      SELECT oi.menu_item_id, oi.quantity, mi.name, mi.description, mi.category
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
    `).all(orderId);

    res.status(201).json({
      success: true,
      data: {
        id: order.id,
        status: order.status,
        name: order.name,
        flat_number: order.flat_number,
        requested_time: order.requested_time,
        fulfilment_type: order.fulfilment_type,
        delivery_location: order.delivery_location,
        special_notes: order.special_notes,
        created_at: order.created_at,
        items: orderItems
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

/**
 * GET /api/orders/:id
 * Get order status by ID
 */
router.get('/:id', (req, res) => {
  try {
    const order = prepare(`
      SELECT id, name, flat_number, requested_time, fulfilment_type, 
             delivery_location, status, special_notes, created_at
      FROM orders
      WHERE id = ?
    `).get(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const orderItems = prepare(`
      SELECT oi.menu_item_id, oi.quantity, mi.name, mi.description, mi.category
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
    `).all(order.id);

    res.json({
      success: true,
      data: {
        ...order,
        items: orderItems
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

module.exports = router;
