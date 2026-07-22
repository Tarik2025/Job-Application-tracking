import Database from 'better-sqlite3';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlitePath = join(__dirname, 'career-copilot.db');

let sqliteDb = null;
let pool = null;
let usingPg = false;

if (process.env.DATABASE_URL) {
  usingPg = true;
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
} else {
  sqliteDb = new Database(sqlitePath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
}

// Helper to convert SQL with '?' placeholders to $1, $2... for pg
function convertPlaceholders(sql) {
  let i = 0;
  let out = '';
  for (let j = 0; j < sql.length; j++) {
    if (sql[j] === '?') {
      i++;
      out += `$${i}`;
    } else {
      out += sql[j];
    }
  }
  return out;
}

// transaction client stack to route queries during a transaction
const txStack = [];

export default {
  usingPg,
  async query(sql, params = []) {
    if (usingPg) {
      const client = txStack.length ? txStack[txStack.length - 1] : await pool.connect();
      try {
        const q = convertPlaceholders(sql);
        const res = await client.query(q, params);
        return res;
      } finally {
        if (!txStack.length) client.release();
      }
    } else {
      const stmt = sqliteDb.prepare(sql);
      return stmt.run(...params);
    }
  },

  async get(sql, params = []) {
    if (usingPg) {
      const client = txStack.length ? txStack[txStack.length - 1] : await pool.connect();
      try {
        const q = convertPlaceholders(sql);
        const res = await client.query(q, params);
        return res.rows[0] || null;
      } finally {
        if (!txStack.length) client.release();
      }
    } else {
      const stmt = sqliteDb.prepare(sql);
      return stmt.get(...params);
    }
  },

  async all(sql, params = []) {
    if (usingPg) {
      const client = txStack.length ? txStack[txStack.length - 1] : await pool.connect();
      try {
        const q = convertPlaceholders(sql);
        const res = await client.query(q, params);
        return res.rows;
      } finally {
        if (!txStack.length) client.release();
      }
    } else {
      const stmt = sqliteDb.prepare(sql);
      return stmt.all(...params);
    }
  },

  async run(sql, params = []) {
    if (usingPg) {
      const client = txStack.length ? txStack[txStack.length - 1] : await pool.connect();
      try {
        const q = convertPlaceholders(sql);
        const res = await client.query(q, params);
        return { changes: res.rowCount, lastInsertRowid: res.rows[0] ? res.rows[0].id : undefined };
      } finally {
        if (!txStack.length) client.release();
      }
    } else {
      const stmt = sqliteDb.prepare(sql);
      const r = stmt.run(...params);
      return r;
    }
  },

  // emulate better-sqlite3 transaction wrapper: db.transaction(() => { ... })
  transaction(fn) {
    if (usingPg) {
      return (async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          txStack.push(client);
          const result = await fn();
          await client.query('COMMIT');
          return result;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          txStack.pop();
          client.release();
        }
      })();
    } else {
      try {
        const t = sqliteDb.transaction(fn);
        return t();
      } catch (err) {
        throw err;
      }
    }
  },

  async exec(sql) {
    if (usingPg) {
      const client = await pool.connect();
      try {
        const q = convertPlaceholders(sql);
        await client.query(q);
      } finally {
        client.release();
      }
    } else {
      sqliteDb.exec(sql);
    }
  },

  logAudit(userId, action, entity, entityId = null, details = null, ip = null) {
    const detailsText = details ? JSON.stringify(details) : null;
    if (usingPg) {
      pool.query('INSERT INTO audit_log (user_id,action,entity,entity_id,details,ip) VALUES ($1,$2,$3,$4,$5,$6)', [userId, action, entity, entityId, detailsText, ip]).catch(() => {});
    } else {
      sqliteDb.prepare('INSERT INTO audit_log (user_id,action,entity,entity_id,details,ip) VALUES (?,?,?,?,?,?)').run(userId, action, entity, entityId, detailsText, ip);
    }
  },

  logActivity(userId, type, title, description = null, entityType = null, entityId = null) {
    if (usingPg) {
      pool.query('INSERT INTO activity_feed (user_id,type,title,description,entity_type,entity_id) VALUES ($1,$2,$3,$4,$5,$6)', [userId, type, title, description, entityType, entityId]).catch(() => {});
    } else {
      sqliteDb.prepare('INSERT INTO activity_feed (user_id,type,title,description,entity_type,entity_id) VALUES (?,?,?,?,?,?)').run(userId, type, title, description, entityType, entityId);
    }
  }
};
