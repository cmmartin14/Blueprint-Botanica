
import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';


export async function GET() {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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