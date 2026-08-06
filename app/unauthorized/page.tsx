export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-900 text-white text-center px-4">
      <div>
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-ink-800/80 mb-6">You don't have permission to view this portal.</p>
        <a href="/login" className="btn-primary">
          Back to Login
        </a>
      </div>
    </div>
  );
}
