const { prepare } = require('./connection');

const seedData = () => {
  // Check if menu items already exist
  const existingItems = prepare('SELECT COUNT(*) as count FROM menu_items').get();
  if (existingItems && existingItems.count > 0) {
    console.log('Database already seeded');
    return;
  }

  // Seed menu items
  const insertMenuItem = prepare(`
    INSERT INTO menu_items (name, description, price_pence, is_active, category)
    VALUES (?, ?, ?, ?, ?)
  `);

  const menuItems = [
    ['Standard Breakfast', 'Full English breakfast with eggs, bacon, sausage, beans, and toast', 0, 1, 'main'],
    ['Veggie Breakfast', 'Vegetarian breakfast with eggs, mushrooms, tomatoes, beans, and toast', 0, 1, 'main'],
    ['Porridge', 'Warm oat porridge with honey or brown sugar', 0, 1, 'main'],
    ['Toast', 'Two slices of toast with butter and jam', 0, 1, 'side'],
    ['Tea', 'Hot tea with milk and sugar', 0, 1, 'drink'],
    ['Coffee', 'Instant coffee with milk and sugar', 0, 1, 'drink'],
    ['Orange Juice', 'Fresh orange juice', 0, 1, 'drink'],
  ];

  for (const item of menuItems) {
    insertMenuItem.run(...item);
  }

  // Create today's service day
  const today = new Date().toISOString().split('T')[0];
  const insertServiceDay = prepare(`
    INSERT OR IGNORE INTO service_days (date, service_start_time, service_end_time, is_open)
    VALUES (?, ?, ?, ?)
  `);
  insertServiceDay.run(today, '08:00', '11:00', 1);

  console.log('Database seeded successfully');
};

module.exports = { seedData };
