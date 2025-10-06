import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // User UID
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth2 error:', error);
      return new NextResponse(`
        <html>
          <body>
            <h1>OAuth2 Error</h1>
            <p>Error: ${error}</p>
            <script>
              window.close();
            </script>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    if (!code || !state) {
      return new NextResponse(`
        <html>
          <body>
            <h1>OAuth2 Error</h1>
            <p>Missing authorization code or state</p>
            <script>
              window.close();
            </script>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    // Exchange the authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/google-callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return new NextResponse(`
        <html>
          <body>
            <h1>Token Exchange Failed</h1>
            <p>Error: ${errorData}</p>
            <script>
              window.close();
            </script>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    const tokenData = await tokenResponse.json();
    
    // Store tokens in the user's custom claims
    const { getAuth } = await import('@/lib/firebase-admin');
    await getAuth().setCustomUserClaims(state, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    });

    return new NextResponse(`
      <html>
        <body>
          <h1>Gmail Access Granted!</h1>
          <p>Your Gmail access has been successfully configured.</p>
          <script>
            window.close();
          </script>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (error) {
    console.error('OAuth2 callback error:', error);
    return new NextResponse(`
      <html>
        <body>
          <h1>OAuth2 Error</h1>
          <p>An error occurred during the OAuth2 flow.</p>
          <script>
            window.close();
          </script>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });
  }
}

