import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GmailScanner } from '@/lib/gmail-scanner';
import { adminDb } from '@/lib/firebase-admin';
import { Deal, ScanResult } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scanner = new GmailScanner(session.accessToken);
    
    // Scan Gmail inbox
    const messages = await scanner.scanInbox({
      maxResults: 100,
      query: 'in:inbox',
    });

    const deals: Deal[] = [];
    const errors: string[] = [];

    // Process messages and extract deals
    for (const message of messages) {
      try {
        if (!scanner.isDealOpportunity(message)) {
          continue;
        }

        const parsedContent = scanner.parseContent(message.subject, message.body);
        const contentHash = scanner.generateContentHash(
          message.subject,
          message.body,
          parsedContent.compensation
        );

        // Check for existing deal with same content hash
        const existingDeal = await adminDb
          .collection('deals')
          .where('userId', '==', session.user?.email)
          .where('contentHash', '==', contentHash)
          .limit(1)
          .get();

        if (!existingDeal.empty) {
          continue; // Skip duplicate
        }

        const deal: Deal = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: session.user?.email || '',
          messageIds: [message.id],
          subject: message.subject,
          brand: parsedContent.brand || 'Unknown',
          compensation: parsedContent.compensation,
          deliverables: parsedContent.deliverables,
          deadline: parsedContent.deadline,
          paymentTerms: parsedContent.paymentTerms,
          type: parsedContent.type,
          confidence: parsedContent.confidence,
          contentHash,
          status: 'New',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Save deal to Firestore
        await adminDb.collection('deals').doc(deal.id).set(deal);
        deals.push(deal);

      } catch (error) {
        errors.push(`Error processing message ${message.id}: ${error}`);
      }
    }

    // Update user's last sync time
    if (session.user?.email) {
      await adminDb.collection('users').doc(session.user.email).set({
        email: session.user.email,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
    }

    const result: ScanResult = {
      deals,
      totalMessages: messages.length,
      processedMessages: deals.length,
      errors,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
