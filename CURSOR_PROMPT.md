# Cursor Project Prompt for Nboxie

You are creating a production-grade web app called Nboxie.
Nboxie scans Gmail inboxes for deals, collaborations, sponsorships, and PR gifting opportunities, classifies them, deduplicates, and shows them in a dashboard.

## 📦 Stack
- **Frontend**: Next.js + React
- **Backend**: Node.js (API routes or Express), Firebase Admin SDK
- **Database**: Firebase Firestore
- **Auth**: Google OAuth2 (NextAuth or custom)
- **Email Access**: Gmail API (with gmail.readonly scope)
- **Optional**: OpenAI API for classification scoring & summarization

## 🔐 Environment Setup

Use a single .env file (same for local + production):

```env
NODE_ENV=production
PORT=3000

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Firebase Web App
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/callback/google

# Chrome Extension OAuth Client
CHROME_EXTENSION_CLIENT_ID=your-chrome-extension-client-id

# OpenAI
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# JWT
JWT_SECRET=GAFr37Thf9fdm8dbf4w5YfgAu69SNsql

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://www.nboxie.com,chrome-extension://kcgbdalbolpdcheiokkmacieiiofmckd

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Client URL
CLIENT_URL=https://www.nboxie.com
```

## 📜 Canonical Gmail Scanning Blueprint

### High-Level Flow
1. User connects Gmail → OAuth2 token issued.
2. Backend or client calls Gmail API (messages.list).
3. Two-phase scanning:
   - Initial Scan (bulk, last 365d).
   - Incremental Sync (Gmail History API).
4. Candidate filtering → regex parsing → classification → dedupe → save to Firestore.
5. Dashboard displays deals grouped by type with confidence scores.

### Regex Rules (extract core info)
- **Compensation** → `\$?\d+(,\d{3})*`
- **Deliverables** → `(\d+\s*(Reels?|TikTok|Stories?|Posts?))`
- **Deadlines** → `(Jan|Feb|Mar|…) \s+\d{1,2}`
- **Payment Terms** → `net\s?(15|30|45|60)`
- **Signals**: UGC, PR/Gifting, Brand Deal.

### Deduplication
- Primary key = Gmail messageId.
- Secondary key = contentHash of subject+body+compensation.

### Confidence Scores
- High (≥0.9) = PR gift / clear sponsorship.
- Medium (0.6–0.8) = ambiguous.
- Low (<0.6) = requires review.

### Incremental Sync
- Store lastHistoryId per user.
- Use history.list → fetch changed messages.
- If expired → fallback to date-bounded query since lastSyncAt.

### Error Handling
- Exponential backoff on 429 / 5xx.
- Retry batches of 20 messages.
- Cache parsed results until Gmail internalDate changes.

## 🗄️ Data Model (Firestore)

```typescript
users/{uid} {
  "email": "user@gmail.com",
  "lastHistoryId": "123456",
  "lastSyncAt": "2025-10-02T12:00:00Z"
}

deals/{dealId} {
  "userId": "abc123",
  "messageIds": ["xyz789"],
  "subject": "Collab with Brand",
  "brand": "BrandX",
  "compensation": 1500,
  "deliverables": ["1 Reel", "3 Stories"],
  "deadline": "2025-10-12",
  "paymentTerms": "net 30",
  "type": "Brand Deal",
  "confidence": 0.92,
  "contentHash": "sha256...",
  "status": "New",
  "createdAt": "...",
  "updatedAt": "..."
}
```

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your `.env` file with the provided configuration
4. Run the development server: `npm run dev`
5. Open http://localhost:3000

## 📁 Project Structure

```
nboxie/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # Dashboard pages
│   │   └── auth/           # Authentication pages
│   ├── components/         # React components
│   ├── lib/               # Utility functions
│   │   ├── firebase.ts    # Firebase configuration
│   │   ├── gmail.ts       # Gmail API client
│   │   ├── auth.ts        # Authentication logic
│   │   └── scanner.ts     # Email scanning algorithm
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Helper utilities
├── public/                # Static assets
├── .env                   # Environment variables
├── .gitignore
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 🔧 Key Features Implemented

- ✅ Google OAuth authentication with Gmail scope
- ✅ Gmail API integration for inbox scanning
- ✅ Regex-based content parsing for deals
- ✅ Deal classification and confidence scoring
- ✅ Deduplication using content hashing
- ✅ Firestore data persistence
- ✅ Dashboard UI with deal management
- ✅ Status tracking and filtering
- ✅ Responsive design with Tailwind CSS

## 🎯 Next Steps for Enhancement

1. **Incremental Sync**: Implement Gmail History API for real-time updates
2. **AI Classification**: Integrate OpenAI API for better deal classification
3. **Email Templates**: Add response templates for common deal types
4. **Analytics**: Track deal success rates and earnings
5. **Chrome Extension**: Build browser extension for quick access
6. **Mobile App**: Create React Native mobile app
7. **Team Collaboration**: Add multi-user support for agencies

## 🔒 Security Considerations

- All Gmail access is read-only
- No raw email content is stored permanently
- OAuth tokens are encrypted and stored securely
- Rate limiting prevents API abuse
- CORS configuration restricts access to authorized domains

## 📊 Performance Optimizations

- Batch processing of Gmail messages (20 per batch)
- Exponential backoff for API rate limits
- Content hashing for efficient deduplication
- Firestore indexing for fast queries
- Client-side caching of deal data

This project provides a solid foundation for a production Gmail deal scanner with room for significant enhancement and customization.

