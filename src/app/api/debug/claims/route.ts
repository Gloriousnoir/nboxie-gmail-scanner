import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user with custom claims
    const user = await getAuth().getUser(decodedToken.uid);
    
    return NextResponse.json({
      uid: user.uid,
      email: user.email,
      customClaims: user.customClaims,
      hasAccessToken: !!user.customClaims?.accessToken,
      hasRefreshToken: !!user.customClaims?.refreshToken,
    });

  } catch (error) {
    console.error('Error getting claims:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
