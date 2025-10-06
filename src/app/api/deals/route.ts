import { NextRequest, NextResponse } from 'next/server';
import { getAuth, adminDb } from '@/lib/firebase-admin';
import { Deal } from '@/types';

export const dynamic = 'force-dynamic';

// Helper function to safely convert Firestore data to JSON-serializable format
function sanitizeFirestoreData(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }
  
  if (data.toDate && typeof data.toDate === 'function') {
    // Firestore Timestamp
    return data.toDate().toISOString();
  }
  
  if (data.toMillis && typeof data.toMillis === 'function') {
    // Firestore Timestamp (alternative method)
    return new Date(data.toMillis()).toISOString();
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeFirestoreData);
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeFirestoreData(value);
    }
    return sanitized;
  }
  
  return data;
}

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
      console.log('Token verified for user:', decodedToken.email);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if Firebase Admin is properly initialized
    if (!adminDb || typeof adminDb.collection !== 'function') {
      console.error('Firebase Admin SDK not properly initialized');
      return NextResponse.json({ 
        error: 'Database not available. Please check server configuration.' 
      }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = searchParams.get('limit') || '50';
    
    // Try the full query first (with orderBy)
    let snapshot;
    try {
      let query = adminDb
        .collection('deals')
        .where('userId', '==', decodedToken.email)
        .orderBy('createdAt', 'desc');

      if (status) {
        query = query.where('status', '==', status);
      }

      if (type) {
        query = query.where('type', '==', type);
      }

      snapshot = await query.limit(parseInt(limit)).get();
    } catch (error: any) {
      // If the query fails due to missing index, try without orderBy
      if (error.code === 'FAILED_PRECONDITION' && error.message?.includes('index')) {
        console.log('Firestore index missing, falling back to query without orderBy');
        
        let fallbackQuery = adminDb
          .collection('deals')
          .where('userId', '==', decodedToken.email);

        if (status) {
          fallbackQuery = fallbackQuery.where('status', '==', status);
        }

        if (type) {
          fallbackQuery = fallbackQuery.where('type', '==', type);
        }

        snapshot = await fallbackQuery.limit(parseInt(limit)).get();
        
        // Sort in memory as fallback
        console.log('Using in-memory sorting as fallback');
      } else {
        throw error; // Re-throw if it's not an index error
      }
    }
    const deals: Deal[] = [];

    snapshot.forEach((doc: any) => {
      const docData = doc.data();
      if (docData && typeof docData === 'object') {
        const sanitizedData = sanitizeFirestoreData(docData);
        deals.push({ id: doc.id, ...sanitizedData } as Deal);
      }
    });

    // Sort in memory if we used the fallback query
    if (deals.length > 0 && deals[0].createdAt) {
      deals.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
    }

    console.log(`Found ${deals.length} deals for user ${decodedToken.email}`);
    return NextResponse.json({ 
      deals,
      message: deals.length > 0 ? 'Deals retrieved successfully' : 'No deals found'
    });

  } catch (error: any) {
    console.error('Error fetching deals:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Provide helpful message for Firestore index errors
    if (error.code === 'FAILED_PRECONDITION' && error.message?.includes('index')) {
      return NextResponse.json({ 
        error: 'Firestore index required',
        message: 'Please create the required Firestore index. Check the server logs for the index creation URL.',
        details: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
