import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { Deal } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = searchParams.get('limit') || '50';
    
    let query = adminDb
      .collection('deals')
      .where('userId', '==', session.user.email)
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.limit(parseInt(limit)).get();
    const deals: Deal[] = [];

    snapshot.forEach((doc: any) => {
      deals.push({ id: doc.id, ...doc.data() } as Deal);
    });

    return NextResponse.json({ deals });

  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
