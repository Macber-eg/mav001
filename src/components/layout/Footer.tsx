import { Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-6 bg-black text-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-400">
              © 2025 maverika inc. All rights reserved.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Enterprise Virtual Employees™ Platform
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <a href="#" className="text-gray-400 hover:text-neon-green transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-400 hover:text-neon-green transition-colors">
              Terms of Service
            </a>
            <a 
              href="https://github.com/maverika/eve-platform" 
              target="_blank" 
              rel="noreferrer"
              className="text-gray-400 hover:text-neon-green transition-colors flex items-center"
            >
              <Github size={16} className="mr-1" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}