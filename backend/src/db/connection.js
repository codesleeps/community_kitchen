const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/kitchen.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;
let lastInsertRowId = 0;

/**
 * Initialize and return the database connection
 */
async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  
  // Try to load existing database
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

/**
 * Save the database to disk
 */
function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

/**
 * Close the database connection
 */
function closeDb() {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}

/**
 * Get the last inserted row ID
 */
function getLastInsertRowId() {
  const result = db.exec("SELECT last_insert_rowid() as id");
  if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
    return result[0].values[0][0];
  }
  return 0;
}

// Helper functions to match better-sqlite3 API
function prepare(sql) {
  return {
    run: (...params) => {
      db.run(sql, params);
      const rowId = getLastInsertRowId();
      const changes = db.getRowsModified();
      saveDb();
      return { lastInsertRowid: rowId, changes };
    },
    get: (...params) => {
      const stmt = db.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },
    all: (...params) => {
      const results = [];
      const stmt = db.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    }
  };
}

function exec(sql) {
  db.run(sql);
  saveDb();
}

function runTransaction(fn) {
  db.run('BEGIN TRANSACTION');
  try {
    const result = fn();
    db.run('COMMIT');
    saveDb();
    return result;
  } catch (error) {
    try {
      db.run('ROLLBACK');
    } catch (rollbackError) {
      // Ignore rollback errors if no transaction is active
    }
    throw error;
  }
}

module.exports = {
  getDb,
  saveDb,
  closeDb,
  prepare,
  exec,
  transaction: runTransaction
};
