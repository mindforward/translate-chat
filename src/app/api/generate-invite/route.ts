import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, expiresInMinutes = 15 } = body;

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

    // Generate unique token
    const token = uuidv4().replace(/-/g, '').substring(0, 16);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    const { data, error } = await serviceClient
      .from('invite_links')
      .insert({
        room_id: roomId,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Create invite link error:', error);
      return NextResponse.json(
        { error: 'Failed to create invite link' },
        { status: 500 }
      );
    }

    // Construct invite URL
    const baseUrl = request.nextUrl.origin;
    const inviteUrl = `${baseUrl}/invite/${token}`;
    const displayToken = token;

    return NextResponse.json({
      token: displayToken,
      url: inviteUrl,
      expires_at: expiresAt.toISOString(),
      expires_in_minutes: expiresInMinutes,
    });
  } catch (error) {
    console.error('Generate invite error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
