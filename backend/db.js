const { Pool } = require('pg');

const pool = new Pool({
  host: '9bc8pwrr.us-east.database.insforge.app',
  port: 5432,
  database: 'insforge',
  user: 'postgres',
  password: '66aa0a20ccf71cbfb3f61bdee4ee5031',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
