import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_KEY not set' }, { status: 500 });
    }

    // Use pg to connect to Supabase transaction pooler
    const { Client } = await import('pg');

    const client = new Client({
      host: 'aws-0-ap-southeast-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: 'postgres.azpvtdhqvfksefuwfueb',
      password: serviceKey,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });

    await client.connect();

    // Create tables
    const sql = `
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invite_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_invite_links_token ON invite_links(token);

      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        nickname TEXT NOT NULL,
        language TEXT NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

      CREATE TABLE IF NOT EXISTS messages (
        id BIGSERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL REFERENCES sessions(session_token) ON DELETE CASCADE,
        nickname TEXT NOT NULL,
        original_text TEXT NOT NULL,
        original_lang TEXT NOT NULL,
        translated_text TEXT,
        translated_lang TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at);
    `;

    await client.query(sql);
    console.log('Tables created');

    // Check if rooms exist
    const { rowCount } = await client.query('SELECT COUNT(*) as count FROM rooms');
    
    if (parseInt(rowCount?.[0]?.count || '0') === 0) {
      // Insert default rooms with bcrypt hashes
      const bcrypt = await import('bcryptjs');
      const passwords = ['fred2024', 'joseph2024', 'family2024', 'friends2024', 'guest2024'];
      const roomNames = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E'];

      for (let i = 0; i < 5; i++) {
        const hash = await bcrypt.hash(passwords[i], 10);
        await client.query(
          'INSERT INTO rooms (id, name, password_hash) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET password_hash = $3',
          [i + 1, roomNames[i], hash]
        );
      }
      console.log('Rooms seeded with passwords');
    }

    // Enable RLS
    const rlsSQL = `
      ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
      ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;
      ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    `;
    await client.query(rlsSQL);
    console.log('RLS enabled');

    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Database setup complete',
      rooms: [
        { id: 1, name: 'Group A', password: 'fred2024' },
        { id: 2, name: 'Group B', password: 'joseph2024' },
        { id: 3, name: 'Group C', password: 'family2024' },
        { id: 4, name: 'Group D', password: 'friends2024' },
        { id: 5, name: 'Group E', password: 'guest2024' },
      ],
    });
  } catch (error: any) {
    console.error('Setup error:', error.message);
    return NextResponse.json(
      { error: error.message, hint: 'Run the SQL in Supabase Dashboard SQL Editor manually' },
      { status: 500 }
    );
  }
}
