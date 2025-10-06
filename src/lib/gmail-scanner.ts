import { google } from 'googleapis';
import { GmailMessage, ParsedContent, DealType, RegexPatterns } from '@/types';

export class GmailScanner {
  private gmail: any;
  private oauth2Client: any;
  private regexPatterns: RegexPatterns;

  constructor(accessToken: string, refreshToken?: string) {
    // Initialize OAuth2 client with proper credentials
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials with access token
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    
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
   * Make authenticated Gmail API call with retry logic
   */
  private async makeGmailCall<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      return await apiCall();
    } catch (error: any) {
      if (error.code === 401 || error.message?.includes('Invalid Credentials')) {
        console.error('Gmail API authentication failed:', error);
        throw new Error('Gmail authentication expired. Please sign in again.');
      }
      throw error;
    }
  }
  /**
   * Test Gmail API connection
   */
  async testConnection(): Promise<any> {
    try {
      const response = await this.makeGmailCall(() =>
        this.gmail.users.getProfile({ userId: 'me' })
      ) as any;
      
      console.log('Gmail profile:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Gmail API test failed:', error);
      throw new Error(`Gmail API test failed: ${error.message || 'Unknown error'}`);
    }
  }

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
      console.log(`Scanning Gmail with query: "${query}", maxResults: ${maxResults}`);
      
      const response = await this.makeGmailCall(() => 
        this.gmail.users.messages.list({
          userId: 'me',
          maxResults,
          q: query,
          includeSpamTrash,
        })
      ) as any;

      const messages = response.data.messages || [];
      console.log(`Found ${messages.length} messages to process`);

      const detailedMessages: GmailMessage[] = [];

      // Process messages in batches to avoid rate limits
      const batchSize = 20;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(messages.length/batchSize)}`);
        
        const batchPromises = batch.map((msg: any) => this.getMessageDetails(msg.id));
        
        try {
          const batchResults = await Promise.all(batchPromises);
          const validMessages = batchResults.filter((msg: any) => msg !== null);
          detailedMessages.push(...validMessages);
          console.log(`Batch processed: ${validMessages.length}/${batch.length} messages valid`);
        } catch (error) {
          console.error(`Error processing batch ${i}-${i + batchSize}:`, error);
          // Continue with next batch
        }
      }

      console.log(`Scan complete: ${detailedMessages.length} messages processed`);
      return detailedMessages;
    } catch (error: any) {
      console.error('Error scanning inbox:', error);
      if (error.message?.includes('Authentication expired')) {
        throw new Error('Authentication expired. Please sign in again.');
      }
      throw new Error(`Gmail scan failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get detailed message information
   */
  private async getMessageDetails(messageId: string): Promise<GmailMessage | null> {
    try {
      const response = await this.makeGmailCall(() =>
        this.gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        })
      ) as any;

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
    } catch (error: any) {
      console.error(`Error getting message details for ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Extract text body from Gmail message payload
   */
  private extractBody(payload: any): string {
    let body = '';
    
    // Handle simple text/plain messages
    if (payload.body && payload.body.data) {
      try {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } catch (error) {
        console.warn('Failed to decode simple body:', error);
      }
    } 
    // Handle multipart messages
    else if (payload.parts) {
      for (const part of payload.parts) {
        // Prefer text/plain over text/html
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          try {
            body += Buffer.from(part.body.data, 'base64').toString('utf-8');
          } catch (error) {
            console.warn('Failed to decode text/plain part:', error);
          }
        } 
        // Fallback to text/html if no plain text
        else if (part.mimeType === 'text/html' && part.body && part.body.data && !body) {
          try {
            const htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
            // Simple HTML tag removal (basic implementation)
            body = htmlBody.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
          } catch (error) {
            console.warn('Failed to decode text/html part:', error);
          }
        }
        // Recursively handle nested parts
        else if (part.parts) {
          body += this.extractBody(part);
        }
      }
    }
    
    return body.trim();
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

