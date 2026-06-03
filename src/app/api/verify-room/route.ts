import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// Verify room password + invite link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    // Invite link verification
    if (body.inviteToken) {
      const { data: link, error } = await serviceClient
        .from('invite_links')
        .select('*')
        .eq('token', body.inviteToken)
        .single();

      if (error || !link) {
        return NextResponse.json(
          { error: 'Invite link 無效' },
          { status: 404 }
        );
      }

      if (link.used) {
        return NextResponse.json(
          { error: 'Invite link 已經使用過' },
          { status: 400 }
        );
      }

      const now = new Date();
      const expiresAt = new Date(link.expires_at);
      if (now > expiresAt) {
        return NextResponse.json(
          { error: 'Invite link 已過期（15分鐘有效）' },
          { status: 400 }
        );
      }

      // Mark as used
      await serviceClient
        .from('invite_links')
        .update({ used: true })
        .eq('id', link.id);

      return NextResponse.json({
        valid: true,
        room_id: link.room_id,
      });
    }

    // Room password verification
    if (body.roomId && body.password) {
      const { data: room, error } = await serviceClient
        .from('rooms')
        .select('*')
        .eq('id', body.roomId)
        .single();

      if (error || !room) {
        return NextResponse.json(
          { error: '房間不存在' },
          { status: 404 }
        );
      }

      const valid = await bcrypt.compare(body.password, room.password_hash);
      if (!valid) {
        return NextResponse.json(
          { error: '密碼錯誤' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        valid: true,
        room_id: room.id,
        room_name: room.name,
      });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Verify room error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
