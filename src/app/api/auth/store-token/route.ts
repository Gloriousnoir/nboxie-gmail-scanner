import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('Store token endpoint called');
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      console.log('Verifying Firebase ID token...');
      decodedToken = await getAuth().verifyIdToken(token);
      console.log('Token verified for user:', decodedToken.email);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { accessToken, refreshToken } = await req.json();
    console.log('Received access token:', accessToken ? 'Yes' : 'No');
    
    if (!accessToken) {
      console.log('No access token provided');
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    // Store both access and refresh tokens in custom claims
    console.log('Setting custom claims for user:', decodedToken.uid);
    await getAuth().setCustomUserClaims(decodedToken.uid, {
      accessToken: accessToken,
      refreshToken: refreshToken || null,
    });
    console.log('Custom claims set successfully');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error storing token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
