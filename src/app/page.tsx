import GoogleSignIn from '@/components/GoogleSignIn';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold mb-4">Nboxie</h1>
        <p className="text-gray-600 mb-6">
          Scan your Gmail for brand deals, sponsorships, and PR opportunities.
        </p>
        <GoogleSignIn />
      </div>
    </div>
  );
}

