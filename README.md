# Nboxie — Gmail Deal Scanner

Nboxie is a web app that helps creators automatically find, extract, and organize brand deals, sponsorship offers, UGC requests, and PR gifting emails directly from Gmail.

## Features
- 🔑 Google OAuth login (Gmail read-only scope)
- 📩 Gmail scanning (bulk + incremental sync)
- 🧠 Regex + rule-based parsing for compensation, deliverables, deadlines
- 🗂️ Classification into PR, UGC, or Brand Deals
- 🔁 Deduplication across threads & follow-ups
- 📊 Confidence scoring + review queue
- 🔒 Secure storage in Firestore (no raw email bodies stored)
- 📈 Metrics logging for tuning & accuracy improvement

## Tech Stack
- **Frontend**: Next.js + React
- **Backend**: Node.js / Firebase Functions
- **Database**: Firestore
- **Auth**: Google OAuth2
- **Email Access**: Gmail API
- **Optional**: OpenAI API for deal summarization

## Setup

1. Clone the repo
   ```bash
   git clone https://github.com/Gloriousnoir/nboxie-gmail-scanner.git
   cd nboxie-gmail-scanner
   ```

2. Create `.env` at the project root and add:
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

3. Install dependencies
   ```bash
   npm install
   ```

4. Run dev server
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000

## How It Works

1. User logs in with Gmail.
2. Nboxie scans inbox with Gmail API.
3. Candidate messages are parsed and classified.
4. Structured deals are saved in Firestore.
5. Dashboard shows all active deals with statuses and confidence.

## Privacy

- Only metadata + structured fields are stored (no raw inbox content).
- Users can purge data at any time.
- Tokens are encrypted and stored securely.

## Project Structure

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

## API Endpoints

- `GET /api/auth/google` - Google OAuth login
- `POST /api/scan` - Trigger Gmail scan
- `GET /api/deals` - Fetch user's deals
- `PUT /api/deals/:id` - Update deal status
- `DELETE /api/deals/:id` - Delete deal

## Gmail Scanning Algorithm

The core scanning algorithm uses regex patterns to extract:

- **Compensation**: `\$?\d+(,\d{3})*`
- **Deliverables**: `(\d+\s*(Reels?|TikTok|Stories?|Posts?))`
- **Deadlines**: `(Jan|Feb|Mar|…)\s+\d{1,2}`
- **Payment Terms**: `net\s?(15|30|45|60)`

Deals are classified with confidence scores:
- High (≥0.9): Clear PR gift or sponsorship
- Medium (0.6–0.8): Ambiguous content
- Low (<0.6): Requires manual review

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

