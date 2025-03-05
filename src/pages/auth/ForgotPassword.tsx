import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const { resetPassword, isLoading, error } = useAuthStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      // Error is already handled in the store
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="text-center mb-8">
            <img 
              src="https://res.cloudinary.com/dkb6nc8tk/image/upload/v1740656617/vv9njdtgliwdbufvqcq9.png" 
              alt="maverika Logo" 
              className="h-12 mx-auto mb-2" 
            />
            <h1 className="text-2xl font-bold text-secondary">Reset Password</h1>
            <p className="text-gray-600 mt-1">Enterprise Virtual Employees™</p>
          </div>
          
          {success ? (
            <div className="text-center">
              <div className="bg-green-50 text-green-700 p-4 rounded-md mb-6">
                <p>Password reset link has been sent to your email.</p>
                <p className="mt-2 text-sm">Please check your inbox and follow the instructions.</p>
              </div>
              <Link 
                to="/login" 
                className="inline-block text-neon-green hover:underline font-medium"
              >
                Return to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <div className="mb-2">
                <p className="text-gray-600 text-sm mb-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-neon-green focus:border-neon-green"
                  placeholder="your@email.com"
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black hover:bg-black/90 text-neon-green font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-green transition-colors border border-neon-green"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
              
              <div className="text-center mt-4">
                <Link to="/login" className="text-neon-green hover:underline text-sm">
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
      
      <p className="mt-6 text-center text-sm text-neon-green">
        © 2025 maverika inc. All rights reserved.
      </p>
    </div>
  );
}

export default ForgotPassword;