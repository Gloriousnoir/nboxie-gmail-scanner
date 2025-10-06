'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      addLog('Starting Google sign-in...');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      addLog(`Signed in successfully: ${user.email}`);
      
      // Get the access token from the credential
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      
      if (accessToken) {
        addLog(`Access token received: ${accessToken.substring(0, 20)}...`);
        addLog('Storing access token...');
        // Store the access token in custom claims
        const storeResponse = await fetch('/api/auth/store-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({ 
            accessToken,
            refreshToken: null
          }),
        });
        
        if (storeResponse.ok) {
          addLog('Access token stored successfully');
          addLog('Refreshing user token to update custom claims...');
          // Force refresh the user's ID token to get updated custom claims
          await user.getIdToken(true);
          addLog('User token refreshed');
          
          // Automatically test custom claims to verify storage worked
          addLog('Verifying custom claims...');
          const claimsResponse = await fetch('/api/debug/claims', {
            headers: {
              'Authorization': `Bearer ${await user.getIdToken()}`,
            },
          });
          const claimsData = await claimsResponse.json();
          if (claimsResponse.ok && claimsData.hasAccessToken) {
            addLog('✅ Custom claims verified - access token is stored!');
          } else {
            addLog(`❌ Custom claims verification failed: ${JSON.stringify(claimsData)}`);
          }
        } else {
          const errorData = await storeResponse.json();
          addLog(`Failed to store access token: ${storeResponse.status} - ${errorData.error}`);
        }
      } else {
        addLog('No access token received - trying OAuth2 flow...');
        // If no access token from Firebase, try OAuth2 flow
        await handleOAuth2Flow(user);
      }
      
    } catch (error: any) {
      addLog(`Sign-in error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth2Flow = async (user: any) => {
    try {
      addLog('Starting OAuth2 flow for Gmail access...');
      
      // Create OAuth2 authorization URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '');
      authUrl.searchParams.set('redirect_uri', `${window.location.origin}/api/auth/google-callback`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', user.uid); // Pass user UID in state
      
      addLog('Opening OAuth2 authorization window...');
      
      // Open popup window for OAuth2
      const popup = window.open(authUrl.toString(), 'google-oauth', 'width=500,height=600');
      
      // Listen for the callback
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          addLog('OAuth2 popup closed');
          // Check if tokens were stored
          setTimeout(async () => {
            const claimsResponse = await fetch('/api/debug/claims', {
              headers: {
                'Authorization': `Bearer ${await user.getIdToken()}`,
              },
            });
            const claimsData = await claimsResponse.json();
            if (claimsResponse.ok && claimsData.hasAccessToken) {
              addLog('✅ OAuth2 flow completed - Gmail access token stored!');
            } else {
              addLog(`❌ OAuth2 flow failed: ${JSON.stringify(claimsData)}`);
            }
          }, 1000);
        }
      }, 1000);
      
    } catch (error: any) {
      addLog(`OAuth2 flow error: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      addLog('Signed out successfully');
      setLogs([]); // Clear logs
    } catch (error: any) {
      addLog(`Sign-out error: ${error.message}`);
    }
  };

  const testClaims = async () => {
    try {
      addLog('Testing custom claims...');
      
      if (!user) {
        addLog('No user found');
        return;
      }
      
      const idToken = await user.getIdToken();
      const claimsResponse = await fetch('/api/debug/claims', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      const claimsData = await claimsResponse.json();
      addLog(`Claims API status: ${claimsResponse.status}`);
      addLog(`Claims data: ${JSON.stringify(claimsData, null, 2)}`);
      
    } catch (error: any) {
      addLog(`Claims test error: ${error.message}`);
    }
  };

  const testAuth = async () => {
    try {
      addLog('Testing authentication...');
      
      if (!user) {
        addLog('No user found');
        return;
      }

      addLog(`User email: ${user.email}`);
      
      const token = await user.getIdToken();
      addLog(`ID token length: ${token.length}`);
      
      // Test deals API
      addLog('Testing /api/deals...');
      const dealsResponse = await fetch('/api/deals', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      addLog(`Deals API status: ${dealsResponse.status}`);
      const dealsData = await dealsResponse.text();
      addLog(`Deals API response: ${dealsData.substring(0, 200)}...`);
      
      // Test scan API
      addLog('Testing /api/scan...');
      const scanResponse = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      addLog(`Scan API status: ${scanResponse.status}`);
      const scanData = await scanResponse.text();
      addLog(`Scan API response: ${scanData.substring(0, 200)}...`);
      
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Debug Authentication</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication</h2>
          {user ? (
            <div>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>UID:</strong> {user.uid}</p>
              <p><strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</p>
              <button
                onClick={handleSignOut}
                className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-4">No user signed in</p>
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4">
            <button
              onClick={testClaims}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Test Custom Claims
            </button>
            <button
              onClick={testAuth}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Test Authentication
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p>No logs yet. Click "Test Authentication" to start.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
