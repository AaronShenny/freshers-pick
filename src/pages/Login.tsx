import { useState } from 'react';
import { supabase } from '../services/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-up">
        {/* Logo / Brand */}
        <div className="mb-12 text-center">
          <h1 className="font-display text-4xl text-white tracking-tight mb-2">Picker</h1>
          <p className="text-[#555] text-sm">Classroom Q&A, done fairly.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#666] uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="teacher@school.com"
              required
              className="w-full bg-[#111] border border-[#1e1e1e] text-white placeholder-[#333] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#444] focus:bg-[#141414] transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#666] uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#111] border border-[#1e1e1e] text-white placeholder-[#333] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#444] focus:bg-[#141414] transition-all duration-200"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-white text-black font-semibold text-sm rounded-xl py-3 transition-all duration-200 hover:bg-[#e8e8e8] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>
      </div>
    </div>
  );
}
