import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
let adminApp: App | undefined;
let adminDb: Firestore | any;

try {
  if (getApps().length === 0) {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    adminApp = getApps()[0];
  }
  
  // Initialize Firestore Admin
  adminDb = getFirestore(adminApp);
} catch (error) {
  console.warn('Firebase Admin initialization failed:', error);
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

export { adminDb };
export default adminApp;

