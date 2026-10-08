// Persistent order storage backed by PostgreSQL.
//
// Orders placed by the customer app are written here so the owner app (running
// anywhere) can read them. Without this shared store each device only saw its
// own local orders.
//
// Follows the same "graceful degradation" pattern as stripe.js / paypal.js: if
// DATABASE_URL is not set the server still boots and stays reachable, but the
// order endpoints return a clear "not configured" error instead of crashing.
//
// Connection string comes from DATABASE_URL (Render injects this when the
// Postgres instance is linked; see render.yaml). Locally, set it in server/.env.

const { Pool } = require('pg');

const { DATABASE_URL } = process.env;

const isConfigured = !!DATABASE_URL;

let pool = null;
if (isConfigured) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    // Render's managed Postgres requires TLS. `rejectUnauthorized: false`
    // accepts Render's certificate chain without bundling a CA file. Local
    // Postgres over a plain connection ignores this.
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  pool.on('error', (err) => {
    // A pooled client erroring in the background should not crash the process.
    console.error('[db] idle client error:', err?.code ?? err?.message);
  });
} else {
  console.warn(
    '[db] No DATABASE_URL set. Order persistence is disabled. ' +
      'Add DATABASE_URL to server/.env (or link a Postgres instance on Render).'
  );
}

function assertConfigured() {
  if (!pool) {
    const err = new Error(
      'The order database is not configured on the server. Set DATABASE_URL.'
    );
    err.code = 'DB_NOT_CONFIGURED';
    throw err;
  }
}

// Create the orders table on first boot if it does not already exist. The
// variable-shaped parts of an order (cart lines, pickup, customer) are stored
// as JSONB so the schema does not have to mirror every nested field.
async function init() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id              TEXT PRIMARY KEY,
      created_at      BIGINT NOT NULL,
      total           NUMERIC(10, 2) NOT NULL,
      status          TEXT NOT NULL DEFAULT 'placed',
      payment_method  TEXT NOT NULL,
      payment_status  TEXT NOT NULL,
      customer        JSONB NOT NULL,
      pickup          JSONB NOT NULL,
      lines           JSONB NOT NULL
    );
  `);
  // Index for the owner listing (newest first).
  await pool.query(
    `CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);`
  );
  console.log('[db] orders table ready');
}

// Map a DB row back to the client-facing Order shape (camelCase, epoch-ms
// createdAt, numeric total).
function rowToOrder(row) {
  return {
    id: row.id,
    createdAt: Number(row.created_at),
    total: Number(row.total),
    status: row.status,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    customer: row.customer,
    pickup: row.pickup,
    lines: row.lines,
  };
}

// Insert an order (idempotent on id so a retried POST does not duplicate).
async function insertOrder(order) {
  assertConfigured();
  const {
    id,
    createdAt,
    total,
    status = 'placed',
    paymentMethod,
    paymentStatus,
    customer,
    pickup,
    lines,
  } = order;

  const { rows } = await pool.query(
    `INSERT INTO orders
       (id, created_at, total, status, payment_method, payment_status, customer, pickup, lines)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO NOTHING
     RETURNING *;`,
    [
      id,
      createdAt,
      total,
      status,
      paymentMethod,
      paymentStatus,
      JSON.stringify(customer),
      JSON.stringify(pickup),
      JSON.stringify(lines),
    ]
  );
  // On conflict (already inserted) RETURNING is empty; fetch the existing row.
  if (rows.length === 0) {
    const existing = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return existing.rows[0] ? rowToOrder(existing.rows[0]) : null;
  }
  return rowToOrder(rows[0]);
}

// List all orders, newest first.
async function listOrders() {
  assertConfigured();
  const { rows } = await pool.query(
    'SELECT * FROM orders ORDER BY created_at DESC;'
  );
  return rows.map(rowToOrder);
}

// Update an order's status. Returns the updated order, or null if not found.
async function updateOrderStatus(id, status) {
  assertConfigured();
  const { rows } = await pool.query(
    'UPDATE orders SET status = $2 WHERE id = $1 RETURNING *;',
    [id, status]
  );
  return rows[0] ? rowToOrder(rows[0]) : null;
}

// Update an order's payment status (used when a Stripe payment is confirmed).
async function updateOrderPaymentStatus(id, paymentStatus) {
  assertConfigured();
  const { rows } = await pool.query(
    'UPDATE orders SET payment_status = $2 WHERE id = $1 RETURNING *;',
    [id, paymentStatus]
  );
  return rows[0] ? rowToOrder(rows[0]) : null;
}

module.exports = {
  isConfigured,
  init,
  insertOrder,
  listOrders,
  updateOrderStatus,
  updateOrderPaymentStatus,
};
