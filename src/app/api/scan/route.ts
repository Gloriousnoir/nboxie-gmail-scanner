import { NextRequest, NextResponse } from 'next/server';
import { getAuth, adminDb } from '@/lib/firebase-admin';
import { scanEmailsLLM } from '@/lib/scanEmailsLLM';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

// Helper function to clean Firestore data by removing undefined values
function cleanFirestoreData(data: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([_, v]) => v !== undefined && v !== null && v !== ""
    )
  );
}

export async function POST(req: NextRequest) {
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

    // Get access token from Firebase Auth
    const user = await getAuth().getUser(decodedToken.uid);
    const accessToken = user.customClaims?.accessToken;
    const refreshToken = user.customClaims?.refreshToken;
    
    console.log('User custom claims:', user.customClaims);
    
    if (!accessToken) {
      console.error('No Gmail access token found in custom claims');
      return NextResponse.json({ error: 'No Gmail access token. Please sign in again.' }, { status: 401 });
    }

    // Check if Firebase Admin is properly initialized
    if (!adminDb || typeof adminDb.collection !== 'function') {
      console.error('Firebase Admin SDK not properly initialized');
      return NextResponse.json({ 
        error: 'Database not available. Please check server configuration.' 
      }, { status: 500 });
    }

    // Create OAuth2 client for Gmail API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    console.log('Starting LLM-based Gmail scan...');
    
    // Use the new LLM-only scanning pipeline
    await scanEmailsLLM(oauth2Client, decodedToken.email || decodedToken.uid);

    // Update user's last sync time
    if (decodedToken.email) {
      const userData = {
        email: decodedToken.email,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      };
      const cleanUserData = cleanFirestoreData(userData);
      await adminDb.collection('users').doc(decodedToken.email).set(cleanUserData, { merge: true });
    }

    console.log('LLM-based Gmail scan completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Gmail scan completed using LLM analysis',
      userId: decodedToken.email 
    });

  } catch (error: any) {
    console.error('LLM scan error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
