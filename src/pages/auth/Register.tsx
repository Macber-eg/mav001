import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signUp, isLoading, error } = useAuthStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate form
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    setValidationError(null);

    try {
      await signUp(email, password, companyName);
      navigate('/dashboard');
    } catch (err) {
      // Error is already handled in the store
    }
  }

  return (
    <div className="min-h-screen bg-neutral flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full bg-dark-surface rounded-lg shadow-neon border border-neon-green overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="text-center mb-8">
            <img 
              src="https://res.cloudinary.com/dkb6nc8tk/image/upload/v1740656617/vv9njdtgliwdbufvqcq9.png" 
              alt="maverika Logo" 
              className="h-12 mx-auto mb-2" 
            />
            <h1 className="text-2xl font-bold text-white">Create an Account</h1>
            <p className="text-gray-400 mt-1">Enterprise Virtual Employees™</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {(error || validationError) && (
              <div className="bg-red-900/20 border border-red-800 text-red-300 p-3 rounded-md text-sm">
                {validationError || error}
              </div>
            )}
            
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-1">
                Company Name
              </label>
              <input
                id="company"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-neon-green focus:border-neon-green"
                placeholder="Your Company"
              />
            </div>
            
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
                className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-neon-green focus:border-neon-green"
                placeholder="your@email.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-neon-green focus:border-neon-green"
                placeholder="••••••••"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-neon-green focus:border-neon-green"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black hover:bg-black/90 text-neon-green font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-green transition-all duration-300 border border-neon-green hover:shadow-neon"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-400">
              Already have an account?{' '}
            </span>
            <Link to="/login" className="text-neon-green hover:text-neon-green/80 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
      
      <p className="mt-6 text-center text-sm text-primary">
        © 2025 maverika, Inc. All rights reserved.
      </p>
    </div>
  );
}

export default Register;