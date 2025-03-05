import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { signIn, isLoading, error } = useAuthStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      // Error is already handled in the store
    }
  }

  return (
    <div className="min-h-screen bg-neutral flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full bg-dark-surface rounded-lg shadow-neon overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="text-center mb-8">
            <img 
              src="https://res.cloudinary.com/dkb6nc8tk/image/upload/v1740656617/vv9njdtgliwdbufvqcq9.png" 
              alt="maverika Logo" 
              className="h-12 mx-auto mb-2" 
            />
            <h1 className="text-2xl font-bold text-white">maverika eve™ Platform</h1>
            <p className="text-gray-400 mt-1">Enterprise Virtual Employees™</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-900/20 border border-red-800 text-red-300 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="your@email.com"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black hover:bg-black/90 text-primary font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors border border-primary hover:shadow-neon"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-400">
              Don't have an account?{' '}
            </span>
            <Link to="/register" className="text-primary hover:text-primary/80 font-medium">
              Sign up
            </Link>
          </div>
        </div>
      </div>
      
      <p className="mt-6 text-center text-sm text-primary">
        © 2025 maverika inc. All rights reserved.
      </p>
    </div>
  );
}

export default Login;