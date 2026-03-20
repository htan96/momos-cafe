"use client";

interface AdminLoginProps {
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  error?: string;
}

export default function AdminLogin({
  password,
  onPasswordChange,
  onSubmit,
  error,
}: AdminLoginProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white border-2 border-cream-dark rounded-2xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <h1 className="font-display text-2xl text-charcoal text-center mb-2">
            Admin Access
          </h1>
          <p className="text-sm text-gray-mid text-center mb-6">
            Enter the password to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-password" className="sr-only">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 rounded-lg border-2 border-cream-dark bg-cream/30 text-charcoal placeholder:text-gray-mid focus:border-teal focus:outline-none transition-colors"
                autoComplete="current-password"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red font-medium" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg bg-teal-dark text-white font-semibold hover:bg-teal transition-colors"
            >
              Enter Admin
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
