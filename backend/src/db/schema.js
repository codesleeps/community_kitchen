const { exec } = require('./connection');

const createTables = () => {
  // Create residents table
  exec(`
    CREATE TABLE IF NOT EXISTS residents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      flat_number TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      pin TEXT
    )
  `);

  // Create menu_items table
  exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price_pence INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      category TEXT DEFAULT 'main'
    )
  `);

  // Create service_days table
  exec(`
    CREATE TABLE IF NOT EXISTS service_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      service_start_time TEXT DEFAULT '08:00',
      service_end_time TEXT DEFAULT '11:00',
      is_open BOOLEAN DEFAULT 1
    )
  `);

  // Create orders table
  exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resident_id INTEGER,
      name TEXT NOT NULL,
      flat_number TEXT NOT NULL,
      service_day_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      requested_time TEXT NOT NULL,
      fulfilment_type TEXT CHECK(fulfilment_type IN ('DELIVERY', 'COLLECTION', 'EAT_IN')) NOT NULL,
      delivery_location TEXT,
      status TEXT CHECK(status IN ('PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED')) DEFAULT 'PENDING',
      special_notes TEXT,
      FOREIGN KEY (resident_id) REFERENCES residents(id),
      FOREIGN KEY (service_day_id) REFERENCES service_days(id)
    )
  `);

  // Create order_items table
  exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    )
  `);

  console.log('All tables created successfully');
};

module.exports = { createTables };
