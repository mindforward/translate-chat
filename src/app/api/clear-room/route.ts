import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json(
        { error: 'Missing roomId' },
        { status: 400 }
      );
    }

    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: 'Service key not configured' },
        { status: 500 }
      );
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Delete all messages in the room
    const { error } = await serviceClient
      .from('messages')
      .delete()
      .eq('room_id', roomId);

    if (error) {
      console.error('Clear room error:', error);
      return NextResponse.json(
        { error: 'Failed to clear messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, roomId });
  } catch (error) {
    console.error('Clear room error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
