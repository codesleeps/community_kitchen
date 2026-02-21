const express = require('express');
const router = express.Router();
const { prepare } = require('../db/connection');

/**
 * GET /api/menu
 * Returns all active menu items
 */
router.get('/', (req, res) => {
  try {
    const menuItems = prepare(`
      SELECT id, name, description, price_pence, category
      FROM menu_items
      WHERE is_active = 1
      ORDER BY 
        CASE category
          WHEN 'main' THEN 1
          WHEN 'side' THEN 2
          WHEN 'drink' THEN 3
          ELSE 4
        END,
        name
    `).all();

    res.json({
      success: true,
      data: menuItems
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch menu' });
  }
});

/**
 * GET /api/menu/:id
 * Returns a single menu item
 */
router.get('/:id', (req, res) => {
  try {
    const menuItem = prepare(`
      SELECT id, name, description, price_pence, category
      FROM menu_items
      WHERE id = ? AND is_active = 1
    `).get(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, error: 'Menu item not found' });
    }

    res.json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch menu item' });
  }
});

module.exports = router;
