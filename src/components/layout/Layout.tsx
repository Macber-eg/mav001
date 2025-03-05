import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useState } from 'react';
import { User } from '../../types/database.types';

interface LayoutProps {
  user: User | null;
}

function Layout({ user }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="bg-neutral min-h-screen flex">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} userRole={user?.role || 'staff'} />
      <div className="flex-1 relative">
        <Header 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          user={user}
        />
        <main className="p-4 md:p-6 pt-20 md:ml-64 bg-neutral min-h-screen mt-[50px] ">
          <div className="mx-auto container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;