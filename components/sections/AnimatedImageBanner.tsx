'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function AnimatedImageBanner() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <section className="relative w-full py-8 md:py-12 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Rotating gradient blurs - matching hero section */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-accent-200/30 to-accent-400/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-primary-300/30 to-primary-500/30 rounded-full blur-3xl"
        />
        
        {/* Enhanced Particle System - matching hero section */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: 0,
                y: 0,
                opacity: 0,
                scale: 0
              }}
              animate={{
                x: [0, 1200, 0],
                y: [0, 800, 0],
                opacity: [0, 0.6, 0],
                scale: [0, 1, 0],
                rotate: [0, 360]
              }}
              transition={{
                duration: 8 + (i * 0.2),
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut"
              }}
              className="absolute w-2 h-2 bg-accent-400/60 rounded-full"
              style={{
                left: `${(i * 5) % 100}%`,
                top: `${(i * 7) % 100}%`
              }}
            />
          ))}
        </div>
        
        {/* Geometric Shapes - matching hero section */}
        <motion.div
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 30, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute top-1/4 left-1/4 w-16 h-16 border-2 border-primary-500/20 transform rotate-30"
        />
        
        <motion.div
          animate={{ 
            rotate: [360, 0],
            scale: [1.2, 1, 1.2]
          }}
          transition={{ 
            duration: 35, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute bottom-1/4 right-1/4 w-20 h-20 border-2 border-accent-500/20 transform -rotate-45"
        />
      </div>

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative max-w-7xl mx-auto flex justify-center"
        >
          {/* Main image container with creative animations - matching missions/visions style */}
          <motion.div
            animate={{
              rotateY: [0, 5, -5, 5, 0],
              rotateX: [0, 2, -2, 2, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              transform: `perspective(1000px) rotateY(${mousePosition.x}deg) rotateX(${mousePosition.y}deg)`
            }}
            className="relative flex-shrink-0 bg-gradient-to-br from-primary-800/30 to-primary-600/30 rounded-2xl border border-primary-500/30 overflow-hidden shadow-2xl p-2"
          >
            {/* Gradient overlay */}
            <motion.div
              animate={{
                background: [
                  'linear-gradient(135deg, rgba(139, 69, 19, 0.1) 0%, rgba(139, 69, 19, 0.3) 100%)',
                  'linear-gradient(135deg, rgba(139, 69, 19, 0.3) 0%, rgba(139, 69, 19, 0.1) 100%)',
                  'linear-gradient(135deg, rgba(139, 69, 19, 0.1) 0%, rgba(139, 69, 19, 0.3) 100%)'
                ]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 z-10 pointer-events-none"
            />

            {/* Image - matching missions/visions ratio */}
            <motion.div
              animate={{
                scale: [0.95, 1, 0.95],
                filter: ['brightness(1)', 'brightness(1.1)', 'brightness(1)']
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative w-[750px] h-[450px] md:w-[750px] md:h-[500px] lg:w-[920px] lg:h-[410px]"
            >
              <img
                src="/assets/images/sections/home/hero-banner.jpg"
                alt="Creative Banner"
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/assets/images/placeholder.jpg'
                }}
              />
            </motion.div>

            {/* Animated border glow */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 30px rgba(139, 69, 19, 0.3)',
                  '0 0 50px rgba(139, 69, 19, 0.5)',
                  '0 0 30px rgba(139, 69, 19, 0.3)'
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-2xl border-2 border-primary-400/30 pointer-events-none"
            />

            {/* Floating decorative elements */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -20, 0],
                  x: [0, 10, 0],
                  rotate: [0, 180, 360],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                  duration: 4 + i,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5
                }}
                className="absolute w-4 h-4 border-2 border-primary-500/40 rounded-full"
                style={{
                  top: `${20 + i * 15}%`,
                  left: `${10 + i * 15}%`,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

