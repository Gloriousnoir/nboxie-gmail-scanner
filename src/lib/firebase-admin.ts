import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
let adminApp: App | undefined;
let adminDb: Firestore | any;

try {
  console.log('Initializing Firebase Admin SDK...');
  console.log('Environment variables check:');
  console.log('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Missing');
  console.log('- FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing');
  console.log('- FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Missing');
  
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      const missing = [];
      if (!process.env.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID');
      if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
      throw new Error(`Missing Firebase Admin environment variables: ${missing.join(', ')}`);
    }
    
    console.log('Creating Firebase Admin app...');
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log('Firebase Admin app created successfully');
  } else {
    adminApp = getApps()[0];
    console.log('Using existing Firebase Admin app');
  }
  
  // Initialize Firestore Admin
  adminDb = getFirestore(adminApp);
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Firebase Admin initialization failed:', error);
  // Create a mock adminDb for development
  adminDb = {
    collection: () => ({
      doc: () => ({
        set: () => Promise.resolve(),
        get: () => Promise.resolve({ empty: true, forEach: () => {} }),
        update: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      }),
      where: () => ({
        orderBy: () => ({
          limit: () => ({
            get: () => Promise.resolve({ empty: true, forEach: () => {} }),
          }),
        }),
      }),
    }),
  } as any;
}

export { adminDb, getAuth };
export default adminApp;

