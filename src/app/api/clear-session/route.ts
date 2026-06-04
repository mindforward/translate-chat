import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { sessionToken } = await request.json();
    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing sessionToken' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('session_token', sessionToken);

    if (error) {
      console.error('Clear session error:', error);
      return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Clear session error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
