import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { cn } from '../utils/cn';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    isAuthenticated,
    loginWithUsername,
    registerWithUsername,
    loginWithGoogle,
    switchDemoUser,
  } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to target or home
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Username is required.');
      return;
    }

    if (mode === 'register') {
      const cleanFullName = fullName.trim();
      if (!cleanFullName) {
        setError('Full Name is required for new registration.');
        return;
      }
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await loginWithUsername(cleanUsername, password);
        if (result.success) {
          showToast(`Welcome back, @${cleanUsername}!`, 'success');
          navigate('/');
        } else {
          setError(result.error || 'Invalid credentials.');
        }
      } else {
        const result = await registerWithUsername(cleanUsername, fullName.trim(), password);
        if (result.success) {
          showToast(`Account created successfully! Welcome, ${fullName.trim()}.`, 'success');
          navigate('/');
        } else {
          setError(result.error || 'Failed to create account.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        showToast('Signed in with Google!', 'success');
        navigate('/');
      } else {
        setError(result.error || 'Google login failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSwitch = (userId: string, name: string) => {
    setError(null);
    switchDemoUser(userId);
    showToast(`Switched active session to ${name}`, 'success');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4 sm:p-6 transition-colors">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-xs select-none">
            H
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Huluga
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Community Fund &amp; Member Loan Management
            </p>
          </div>
        </div>

        {/* Main Auth Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6 sm:p-8">
          {/* Mode Switch Tabs */}
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-6">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              data-testid="tab-login"
              className={cn(
                'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors text-center select-none',
                mode === 'login'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              data-testid="tab-register"
              className={cn(
                'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors text-center select-none',
                mode === 'register'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              )}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="fullName"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  data-testid="input-fullname"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 transition-colors"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoCapitalize="none"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. maria or juan"
                data-testid="input-username"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Password
                </label>
                <span className="text-[11px] text-zinc-400">
                  {mode === 'login' ? 'Any password for demo' : 'Minimum 6 chars'}
                </span>
              </div>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="input-password"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 transition-colors"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={loading}
              data-testid="submit-auth-button"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              {mode === 'login' ? 'Sign In to Huluga' : 'Create Member Account'}
            </Button>
          </form>

          {/* Social Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 select-none">
                or
              </span>
            </div>
          </div>

          {/* Google Login Button */}
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
            onClick={handleGoogleLogin}
            disabled={loading}
            data-testid="google-login-button"
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            }
          >
            Continue with Google
          </Button>
        </div>

        {/* Local Testing Quick Access */}
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-900/40 p-4 sm:p-5">
          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Local Testing Quick Access</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 leading-relaxed">
            Instant 1-click login using pre-seeded test accounts without entering credentials.
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={() => handleDemoSwitch('user-1', 'Maria Santos (Treasurer)')}
              data-testid="demo-maria-button"
              className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-850 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-xs transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                  MS
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                    Maria Santos
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">@maria</div>
                </div>
              </div>
              <Badge variant="emerald" size="sm" dot className="font-semibold text-[10px]">
                Treasurer
              </Badge>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
