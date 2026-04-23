
import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import { syncUserToNeon } from '../../../../lib/userSync';


export async function GET() {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await syncUserToNeon({
        id: user.id,
        primaryEmail: user.primaryEmail,
        displayName: user.displayName,
      });
    } catch (syncError) {
      // Do not block auth on sync issues; user can still proceed.
      console.warn("Failed to sync Stack user to Neon users_sync:", syncError);
    }

    return NextResponse.json({
      id: user.id,
      email: user.primaryEmail,
      name: user.displayName || user.primaryEmail?.split('@')[0],
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}