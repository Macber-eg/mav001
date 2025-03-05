import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Zap, Users, Bot, MousePointer } from 'lucide-react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

// Particle Trail Component
const ParticleTrail = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const newParticle = {
        x: e.clientX,
        y: e.clientY,
        id: Date.now()
      };
      setParticles(prev => [...prev, newParticle]);

      // Remove old particles
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== newParticle.id));
      }, 1000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{ 
              position: 'absolute', 
              left: particle.x, 
              top: particle.y,
              backgroundColor: 'rgba(0, 255, 178, 0.5)',
              width: '4px',
              height: '4px',
              borderRadius: '50%'
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Interactive Feature Card
const FeatureCard = ({ icon: Icon, title, description }) => {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 10;
    const rotateY = -(x - centerX) / 10;

    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
  };

  return (
    <motion.div 
      ref={cardRef}
      className="feature-card bg-dark-surface p-6 rounded-lg border border-dark-border hover:shadow-neon transition-all duration-300 transform"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.05 }}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Icon className="w-12 h-12 text-neon-green mb-4" />
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </motion.div>
  );
};

// Animated Counter
const AnimatedCounter = ({ end, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const counterRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 2000; // 2 seconds
          const stepTime = Math.abs(Math.floor(duration / end));
          
          const timer = setInterval(() => {
            start += 1;
            setCount(start);
            
            if (start === end) {
              clearInterval(timer);
            }
          }, stepTime);

          return () => clearInterval(timer);
        }
      },
      { threshold: 0.1 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => {
      if (counterRef.current) {
        observer.unobserve(counterRef.current);
      }
    };
  }, [end]);

  return (
    <div ref={counterRef} className="text-5xl font-bold text-neon-green mb-2">
      {count}{suffix}
    </div>
  );
};

function LandingPage() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sceneRef.current) return;

    // Set up Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    sceneRef.current.appendChild(renderer.domElement);

    // Create a glowing, more complex geometry
    const geometry = new THREE.IcosahedronGeometry(2, 2);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00FFB2,
      emissive: 0x00FFB2,
      emissiveIntensity: 0.7,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Add more dynamic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00FFB2, 2);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const directionalLight = new THREE.DirectionalLight(0x00FFB2, 0.5);
    directionalLight.position.set(-5, -5, -5);
    scene.add(directionalLight);

    camera.position.z = 5;

    // More complex animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      mesh.rotation.x += 0.002;
      mesh.rotation.y += 0.003;
      mesh.rotation.z += 0.001;
      renderer.render(scene, camera);
    };

    animate();

    // GSAP Animations with more advanced effects
    if (containerRef.current) {
      // Hero section with more dynamic animation
      gsap.fromTo('.hero-content', 
        { 
          opacity: 0, 
          y: 100,
          scale: 0.9 
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.2,
          ease: 'power3.out'
        }
      );

      // Feature cards with staggered and perspective animations
      gsap.from('.feature-card', {
        scrollTrigger: {
          trigger: '.features',
          start: 'top center',
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        y: 50,
        rotationX: -15,
        scale: 0.9,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power2.out'
      });

      // More dramatic stats animation
      gsap.from('.stat-item', {
        scrollTrigger: {
          trigger: '.stats',
          start: 'top center',
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        scale: 0.5,
        rotation: -15,
        duration: 0.8,
        stagger: 0.2,
        ease: 'back.out(1.7)'
      });
    }

    // Responsive scene resizing
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current) {
        sceneRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-neutral relative">
      {/* Particle Trail */}
      <ParticleTrail />

      {/* 3D Scene Container */}
      <div 
        ref={sceneRef} 
        className="fixed inset-0 pointer-events-none opacity-50"
        style={{ zIndex: 0, filter: 'blur(2px)' }}
      />

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-neutral/80 before:to-transparent before:z-[1]">
        <motion.div 
          className="hero-content text-center max-w-4xl relative z-[2] backdrop-blur-sm bg-neutral/10 p-8 rounded-lg border border-neon-green/20 shadow-neon"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">
            Enterprise Virtual Employees™
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-8">
            Revolutionize your business with AI-powered virtual employees that learn, adapt, and collaborate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/register"
                className="px-8 py-3 bg-neon-green text-black rounded-md font-medium hover:shadow-neon transition-all duration-300 inline-block"
              >
                Get Started Free
              </Link>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/login"
                className="px-8 py-3 bg-black text-neon-green rounded-md font-medium border border-neon-green hover:shadow-neon transition-all duration-300 inline-block"
              >
                Sign In
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="features relative bg-black/80 backdrop-blur-md py-24 px-4 z-[2]">
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            className="text-4xl font-bold text-center text-white mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Powerful Features
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={Brain}
              title="AI Intelligence"
              description="Advanced AI capabilities powered by state-of-the-art language models."
            />
            <FeatureCard 
              icon={Zap}
              title="Automation"
              description="Streamline workflows and automate repetitive tasks effortlessly."
            />
            <FeatureCard 
              icon={Users}
              title="Collaboration"
              description="EVEs work together seamlessly to accomplish complex tasks."
            />
            <FeatureCard 
              icon={Bot}
              title="Learning"
              description="Continuous learning and improvement from interactions."
            />
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats relative py-24 px-4 z-[2] before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:to-neutral/80">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="stat-item text-center">
              <AnimatedCounter end={99} suffix=".9%" />
              <div className="text-xl text-gray-400">Uptime</div>
            </div>
            <div className="stat-item text-center">
              <AnimatedCounter end={1} suffix="M+" />
              <div className="text-xl text-gray-400">Tasks Completed</div>
            </div>
            <div className="stat-item text-center">
              <AnimatedCounter end={500} suffix="+" />
              <div className="text-xl text-gray-400">Happy Companies</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <motion.div 
        className="relative py-24 px-4 bg-black/80 backdrop-blur-md z-[2]"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join the future of work with Enterprise Virtual Employees™.
          </p>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              to="/register"
              className="inline-block px-8 py-3 bg-neon-green text-black rounded-md font-medium hover:shadow-neon transition-all duration-300"
            >
              Get Started Now
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default LandingPage;