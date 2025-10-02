// TypeScript type definitions for Nboxie

export interface User {
  uid: string;
  email: string;
  lastHistoryId?: string;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  userId: string;
  messageIds: string[];
  subject: string;
  brand: string;
  compensation?: number;
  deliverables: string[];
  deadline?: string;
  paymentTerms?: string;
  type: DealType;
  confidence: number;
  contentHash: string;
  status: DealStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type DealType = 'PR Gift' | 'UGC' | 'Brand Deal' | 'Sponsorship' | 'Unknown';
export type DealStatus = 'New' | 'In Progress' | 'Completed' | 'Declined' | 'Archived';

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  date: Date;
  snippet: string;
  body: string;
  labels: string[];
}

export interface ScanResult {
  deals: Deal[];
  totalMessages: number;
  processedMessages: number;
  errors: string[];
  lastHistoryId?: string;
}

export interface ParsedContent {
  compensation?: number;
  deliverables: string[];
  deadline?: string;
  paymentTerms?: string;
  brand?: string;
  type: DealType;
  confidence: number;
}

export interface RegexPatterns {
  compensation: RegExp;
  deliverables: RegExp;
  deadline: RegExp;
  paymentTerms: RegExp;
  prGift: RegExp;
  ugc: RegExp;
  brandDeal: RegExp;
  sponsorship: RegExp;
}

