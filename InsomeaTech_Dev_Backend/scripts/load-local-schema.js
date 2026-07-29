const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inDollarQuote = false;
  let dollarTag = '';
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1] || '';

    if (inDollarQuote) {
      if (sql.startsWith(dollarTag + '$', i)) {
        current += dollarTag + '$';
        i += dollarTag.length + 1;
        inDollarQuote = false;
        dollarTag = '';
      } else {
        current += char;
        i += 1;
      }
      continue;
    }

    if (inSingleQuote) {
      current += char;
      if (char === "'" && next === "'") {
        current += next;
        i += 2;
        continue;
      }
      if (char === "'") {
        inSingleQuote = false;
      }
      i += 1;
      continue;
    }

    if (inDoubleQuote) {
      current += char;
      if (char === '"' && next === '"') {
        current += next;
        i += 2;
        continue;
      }
      if (char === '"') {
        inDoubleQuote = false;
      }
      i += 1;
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      current += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      current += char;
      i += 1;
      continue;
    }

    if (char === '$') {
      const match = sql.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (match) {
        const token = match[0];
        inDollarQuote = true;
        dollarTag = token.slice(1, -1);
        current += token;
        i += token.length;
        continue;
      }
    }

    if (char === ';') {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
      i += 1;
      continue;
    }

    current += char;
    i += 1;
  }

  const trailing = current.trim();
  if (trailing) {
    statements.push(trailing);
  }

  return statements;
}

function shouldIgnoreError(error) {
  const message = (error.message || '').toLowerCase();
  return (
    error.code === '42P07' ||
    error.code === '42P06' ||
    error.code === '42710' ||
    error.code === '42701' ||
    error.code === '23505' ||
    message.includes('already exists') ||
    message.includes('duplicate object') ||
    message.includes('duplicate key') ||
    message.includes('does not exist')
  );
}

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    try {
      const schemaName = process.env.DB_SCHEMA || 'insomea_tech';
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
      await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

      const files = [
        path.join(__dirname, '..', 'databaseDDL.sql.txt'),
        path.join(__dirname, '..', 'trigger_functions.sql')
      ];

      for (const file of files) {
        if (!fs.existsSync(file)) {
          console.log(`Skipping missing file: ${file}`);
          continue;
        }

        const sql = fs.readFileSync(file, 'utf8');
        if (!sql || !sql.trim()) {
          continue;
        }

        const statements = splitSqlStatements(sql);
        for (const statement of statements) {
          try {
            await client.query(statement);
          } catch (error) {
            if (shouldIgnoreError(error)) {
              console.log(`Skipped existing object: ${statement.split('\n')[0]}`);
            } else {
              throw error;
            }
          }
        }

        console.log(`Loaded ${path.basename(file)}`);
      }

      console.log('Local schema import completed.');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Local schema import failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
