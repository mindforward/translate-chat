const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').filter(Boolean).forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=');
});

const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_KEY env var');
  process.exit(1);
}

const client = new Client({
  host: 'db.azpvtdhqvfksefuwfueb.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: serviceKey,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL');

    const sql = fs.readFileSync('scripts/schema.sql', 'utf8');
    await client.query(sql);
    console.log('✅ Schema created successfully');

    // Now set the actual password hashes
    const bcrypt = require('bcryptjs');
    const passwords = [
      'fred2024',
      'joseph2024',
      'family2024',
      'friends2024',
      'guest2024',
    ];

    for (let i = 0; i < passwords.length; i++) {
      const hash = await bcrypt.hash(passwords[i], 10);
      await client.query(
        'UPDATE rooms SET password_hash = $1 WHERE id = $2',
        [hash, i + 1]
      );
      console.log(`  Room ${i + 1} password set`);
    }

    console.log('\n✅ Room passwords set successfully');
    console.log('\n📋 Room passwords:');
    passwords.forEach((p, i) => {
      console.log(`  Room ${i + 1} (Group ${String.fromCharCode(65 + i)}): ${p}`);
    });

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
