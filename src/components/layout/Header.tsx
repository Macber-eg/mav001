import { Menu, Bell, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../../types/database.types';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  user: User | null;
}

function Header({ sidebarOpen, setSidebarOpen, user }: HeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sample notifications for demo
  const notifications = [
    {
      id: 1,
      title: 'New EVE activated',
      message: 'Your virtual employee has been activated successfully',
      time: '5 minutes ago',
      read: false
    },
    {
      id: 2,
      title: 'Action completed',
      message: 'EVE-Assistant completed the scheduled task',
      time: '1 hour ago',
      read: true
    }
  ];

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      // Navigation is handled in the signOut function
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  return (
    <header className="bg-dark-surface border-b border-dark-border fixed top-0 left-0 right-0 h-16 z-40 md:ml-64">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-primary md:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>
          <div className="ml-4 text-white md:hidden">
            <span className="font-medium text-primary">EVEs™</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-5">
          <div className="relative" ref={notificationRef}>
            <button 
              className="text-gray-400 hover:text-primary relative focus:outline-none"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 bg-primary text-black text-xs rounded-full h-4 w-4 flex items-center justify-center">
                2
              </span>
            </button>
            
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-dark-surface rounded-md shadow-neon border border-dark-border py-1 z-50">
                <div className="px-4 py-2 text-sm border-b border-dark-border">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-white">Notifications</h3>
                    <button className="text-xs text-primary hover:text-primary/80">
                      Mark all as read
                    </button>
                  </div>
                </div>
                
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`px-4 py-3 border-b border-dark-border text-sm hover:bg-black/20 ${
                        !notification.read ? 'bg-black/10' : ''
                      }`}
                    >
                      <div className="flex justify-between">
                        <p className="font-medium text-white">{notification.title}</p>
                        <span className="text-xs text-gray-500">{notification.time}</span>
                      </div>
                      <p className="text-gray-400 mt-1">{notification.message}</p>
                    </div>
                  ))}
                </div>
                
                <div className="px-4 py-2 text-center border-t border-dark-border">
                  <Link to="/notifications" className="text-sm text-primary hover:text-primary/80">
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center text-gray-400 hover:text-primary focus:outline-none"
              aria-label="User menu"
            >
              <div className="h-8 w-8 rounded-full bg-primary text-black flex items-center justify-center mr-2">
                <UserIcon size={16} />
              </div>
              <span className="hidden md:block truncate max-w-[150px] text-white">{user?.email}</span>
            </button>
            
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-dark-surface rounded-md shadow-neon border border-dark-border py-1 z-50">
                <div className="px-4 py-2 text-sm text-white border-b border-dark-border">
                  <p className="font-medium truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {user?.role?.replace('_', ' ') || 'User'}
                  </p>
                </div>
                <Link 
                  to="/app/profile" 
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-black/20"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Profile Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;