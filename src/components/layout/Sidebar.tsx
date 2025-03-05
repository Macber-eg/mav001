import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Zap, 
  Activity, 
  Settings, 
  FileCog, 
  X,
  Clock,
  MessageSquare,
  Bell,
  ShoppingBag,
  Book
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userRole: string;
}

function Sidebar({ isOpen, setIsOpen, userRole }: SidebarProps) {
  const location = useLocation();
  
  // Function to check if a path is active
  const isActive = (path: string) => {
    const appPath = `/app${path}`;
    return location.pathname === appPath || location.pathname.startsWith(`${appPath}/`);
  };

  // Base navigation items for all users
  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: <LayoutDashboard size={20} />,
      description: 'Overview and analytics'
    },
    { 
      name: 'Virtual Employees™', 
      path: '/eves', 
      icon: <Users size={20} />,
      description: 'Manage your EVEs'
    },
    { 
      name: 'Actions Repository', 
      path: '/actions', 
      icon: <Zap size={20} />,
      description: 'Available actions'
    },
    { 
      name: 'Tasks & Workflows', 
      path: '/tasks', 
      icon: <Clock size={20} />,
      description: 'Manage tasks'
    },
    { 
      name: 'Collaborations', 
      path: '/collaborations', 
      icon: <MessageSquare size={20} />,
      description: 'EVE collaborations'
    },
    { 
      name: 'Knowledge Base', 
      path: '/knowledge', 
      icon: <Book size={20} />,
      description: 'Company knowledge'
    },
    { 
      name: 'Activity Logs', 
      path: '/logs', 
      icon: <Activity size={20} />,
      description: 'System logs'
    },
    { 
      name: 'Notifications', 
      path: '/notifications', 
      icon: <Bell size={20} />,
      description: 'System notifications'
    },
    { 
      name: 'Marketplace', 
      path: '/marketplace', 
      icon: <ShoppingBag size={20} />,
      description: 'EVE marketplace'
    }
  ];

  // Admin-only items
  if (userRole === 'company_admin' || userRole === 'system_admin') {
    navItems.push({ 
      name: 'Settings', 
      path: '/settings', 
      icon: <Settings size={20} />,
      description: 'System settings'
    });
  }
  
  // Always show profile settings
  navItems.push({ 
    name: 'Profile', 
    path: '/profile', 
    icon: <FileCog size={20} />,
    description: 'Your profile'
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-dark-surface border-r border-dark-border flex flex-col`}
      >
        {/* Logo/Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-dark-border">
          <div className="flex items-center">
            <img 
              src="https://res.cloudinary.com/dkb6nc8tk/image/upload/v1740656617/vv9njdtgliwdbufvqcq9.png" 
              alt="Logo" 
              className="h-8 w-auto"
            />
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden text-gray-400 hover:text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            aria-label="Close sidebar"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-border scrollbar-track-transparent">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={`/app${item.path}`}
                    className={`
                      group flex items-center px-4 py-3 rounded-lg transition-all duration-200
                      ${active 
                        ? 'bg-primary text-black font-medium shadow-neon' 
                        : 'text-gray-400 hover:text-primary hover:bg-primary/10'
                      }
                    `}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className={`mr-3 transition-colors duration-200 ${
                      active ? 'text-black' : 'text-gray-400 group-hover:text-primary'
                    }`}>
                      {item.icon}
                    </span>
                    <div>
                      <span className="block">{item.name}</span>
                      <span className={`text-xs transition-colors duration-200 ${
                        active ? 'text-black/70' : 'text-gray-500 group-hover:text-primary/70'
                      }`}>
                        {item.description}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-dark-border">
          <div className="text-xs text-gray-400 text-center">
            <p>© 2025 maverika, Inc.</p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;