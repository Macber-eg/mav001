import { Link } from 'react-router-dom'; 
import { ArrowLeft, Bot, Search, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

function NotFound() {
  return (
    <div className="min-h-screen bg-neutral flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 gap-4 opacity-10">
        {[...Array(144)].map((_, i) => (
          <div 
            key={i}
            className="border border-neon-green/20"
            style={{
              animation: `pulse ${2 + Math.random() * 3}s infinite ${Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      
      {/* Main content */}
      <motion.div 
        className="max-w-2xl w-full text-center relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Glowing 404 */}
        <motion.h1 
          className="text-[12rem] font-bold text-neon-green leading-none tracking-tighter"
          style={{ textShadow: '0 0 20px rgba(0, 255, 178, 0.5)' }}
          animate={{ 
            textShadow: ['0 0 20px rgba(0, 255, 178, 0.5)', '0 0 40px rgba(0, 255, 178, 0.8)', '0 0 20px rgba(0, 255, 178, 0.5)']
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          404
        </motion.h1>
        
        {/* Subtitle with typing effect */}
        <motion.h2 
          className="text-3xl font-bold bg-gradient-to-r from-neon-green via-neon-blue to-neon-purple bg-clip-text text-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Page Lost in the Algorithm
        </motion.h2>
        
        {/* Description with animated icons */}
        <motion.div 
          className="mt-6 mb-8 text-gray-400 flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <p className="flex items-center gap-2">
            <Bot className="text-neon-green animate-bounce" />
            Looks like our AI just can't compute this page's existence.
          </p>
          <p className="flex items-center gap-2">
            <Search className="text-neon-green animate-pulse" />
            Don't worry—our bots have already started a search party.
          </p>
          <p className="flex items-center gap-2">
            <Zap className="text-neon-green animate-ping" />
            In the meantime, let's get you back on track:
          </p>
        </motion.div>
        
        {/* Return button with hover effect */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link 
            to="/app/dashboard" 
            className="inline-flex items-center px-6 py-3 bg-black text-neon-green rounded-md font-medium border border-neon-green hover:shadow-neon transition-all duration-300"
          >
            <ArrowLeft size={18} className="mr-2" />
            Return Home
          </Link>
        </motion.div>
      </motion.div>
      
      {/* Animated particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-neon-green rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 5}s infinite ${Math.random() * 5}s`
            }}
          />
        ))}
    </div>
    </div>
  ); 
}


export default NotFound