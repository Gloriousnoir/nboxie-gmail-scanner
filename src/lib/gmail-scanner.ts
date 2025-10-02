import { google } from 'googleapis';
import { GmailMessage, ParsedContent, DealType, RegexPatterns } from '@/types';

export class GmailScanner {
  private gmail: any;
  private regexPatterns: RegexPatterns;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    this.gmail = google.gmail({ version: 'v1', auth });
    
    // Initialize regex patterns for content extraction
    this.regexPatterns = {
      compensation: /\$?\d+(,\d{3})*(\.\d{2})?/g,
      deliverables: /(\d+\s*(Reels?|TikTok|Stories?|Posts?|Videos?|Photos?))/gi,
      deadline: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(st|nd|rd|th)?/gi,
      paymentTerms: /net\s?(15|30|45|60)/gi,
      prGift: /(pr\s*gift|gift|free\s*product|complimentary|sample)/gi,
      ugc: /(ugc|user\s*generated|content\s*creation|organic\s*content)/gi,
      brandDeal: /(brand\s*deal|partnership|collaboration|sponsor)/gi,
      sponsorship: /(sponsor|paid\s*partnership|brand\s*ambassador)/gi,
    };
  }

  /**
   * Scan Gmail inbox for deals and opportunities
   */
  async scanInbox(options: {
    maxResults?: number;
    query?: string;
    includeSpamTrash?: boolean;
  } = {}): Promise<GmailMessage[]> {
    const {
      maxResults = 100,
      query = 'in:inbox',
      includeSpamTrash = false
    } = options;

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query,
        includeSpamTrash,
      });

      const messages = response.data.messages || [];
      const detailedMessages: GmailMessage[] = [];

      // Process messages in batches to avoid rate limits
      const batchSize = 20;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const batchPromises = batch.map((msg: any) => this.getMessageDetails(msg.id));
        
        try {
          const batchResults = await Promise.all(batchPromises);
          detailedMessages.push(...batchResults.filter((msg: any) => msg !== null));
        } catch (error) {
          console.error(`Error processing batch ${i}-${i + batchSize}:`, error);
          // Continue with next batch
        }
      }

      return detailedMessages;
    } catch (error) {
      console.error('Error scanning inbox:', error);
      throw error;
    }
  }

  /**
   * Get detailed message information
   */
  private async getMessageDetails(messageId: string): Promise<GmailMessage | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload.headers;
      
      const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const body = this.extractBody(message.payload);
      
      return {
        id: message.id,
        threadId: message.threadId,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        to: getHeader('To').split(',').map((email: string) => email.trim()),
        date: new Date(parseInt(message.internalDate)),
        snippet: message.snippet,
        body,
        labels: message.labelIds || [],
      };
    } catch (error) {
      console.error(`Error getting message details for ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Extract text body from Gmail message payload
   */
  private extractBody(payload: any): string {
    let body = '';
    
    if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString();
    } else if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          body += Buffer.from(part.body.data, 'base64').toString();
        } else if (part.parts) {
          body += this.extractBody(part);
        }
      }
    }
    
    return body;
  }

  /**
   * Parse email content to extract deal information
   */
  parseContent(subject: string, body: string): ParsedContent {
    const content = `${subject} ${body}`.toLowerCase();
    
    // Extract compensation
    const compensationMatch = content.match(this.regexPatterns.compensation);
    const compensation = compensationMatch ? 
      parseInt(compensationMatch[0].replace(/[$,]/g, '')) : undefined;

    // Extract deliverables
    const deliverablesMatches = content.match(this.regexPatterns.deliverables);
    const deliverables = deliverablesMatches || [];

    // Extract deadline
    const deadlineMatch = content.match(this.regexPatterns.deadline);
    const deadline = deadlineMatch ? deadlineMatch[0] : undefined;

    // Extract payment terms
    const paymentMatch = content.match(this.regexPatterns.paymentTerms);
    const paymentTerms = paymentMatch ? paymentMatch[0] : undefined;

    // Extract brand name (simplified - look for common patterns)
    const brandMatch = content.match(/(?:brand|company|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    const brand = brandMatch ? brandMatch[1] : undefined;

    // Classify deal type and calculate confidence
    const { type, confidence } = this.classifyDeal(content, compensation);

    return {
      compensation,
      deliverables,
      deadline,
      paymentTerms,
      brand,
      type,
      confidence,
    };
  }

  /**
   * Classify deal type and calculate confidence score
   */
  private classifyDeal(content: string, compensation?: number): { type: DealType; confidence: number } {
    let type: DealType = 'Unknown';
    let confidence = 0;

    // Check for PR Gift indicators
    if (this.regexPatterns.prGift.test(content)) {
      type = 'PR Gift';
      confidence = 0.9;
    }
    // Check for UGC indicators
    else if (this.regexPatterns.ugc.test(content)) {
      type = 'UGC';
      confidence = compensation ? 0.8 : 0.6;
    }
    // Check for Brand Deal indicators
    else if (this.regexPatterns.brandDeal.test(content)) {
      type = 'Brand Deal';
      confidence = compensation ? 0.9 : 0.7;
    }
    // Check for Sponsorship indicators
    else if (this.regexPatterns.sponsorship.test(content)) {
      type = 'Sponsorship';
      confidence = compensation ? 0.95 : 0.8;
    }
    // Fallback classification based on compensation
    else if (compensation) {
      type = 'Brand Deal';
      confidence = 0.6;
    }

    // Adjust confidence based on additional factors
    if (compensation && compensation > 1000) {
      confidence = Math.min(confidence + 0.1, 1.0);
    }

    return { type, confidence };
  }

  /**
   * Generate content hash for deduplication
   */
  generateContentHash(subject: string, body: string, compensation?: number): string {
    const crypto = require('crypto');
    const content = `${subject}${body}${compensation || ''}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if message is a deal opportunity
   */
  isDealOpportunity(message: GmailMessage): boolean {
    const content = `${message.subject} ${message.body}`.toLowerCase();
    
    // Keywords that indicate deal opportunities
    const dealKeywords = [
      'collaboration', 'partnership', 'sponsor', 'brand deal',
      'pr gift', 'gift', 'free product', 'complimentary',
      'ugc', 'user generated content', 'content creation',
      'influencer', 'ambassador', 'campaign'
    ];

    return dealKeywords.some(keyword => content.includes(keyword));
  }
}

