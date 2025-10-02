import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { dealId: string } }) {
  const { dealId } = params;

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await req.json();
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const validStatuses = ['New', 'In Progress', 'Completed', 'Declined', 'Archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await adminDb.collection('deals').doc(dealId).update({
      status,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { dealId: string } }) {
  const { dealId } = params;

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await adminDb.collection('deals').doc(dealId).delete();
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting deal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
