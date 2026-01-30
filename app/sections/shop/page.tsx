'use client'

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { Pause, Play } from 'lucide-react'
import { HiMiniShoppingBag, HiOutlineShoppingBag } from 'react-icons/hi2'
import CafeVideoSection from '@/components/sections/CafeVideoSection'
import CafeMenuSection from '@/components/sections/CafeMenuSection'

export default function ShopPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  // Lookbook Carousel state
  const [currentLookIndex, setCurrentLookIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  
  // Style Categories state
  const [expandedStyle, setExpandedStyle] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  // Moodboard state
  const [selectedMood, setSelectedMood] = useState('inspiration')
  const [moodboardImages, setMoodboardImages] = useState<Array<{icon: string, name: string, image: string}>>([])
  const [displayedImages, setDisplayedImages] = useState<Array<{icon: string, name: string, image: string}>>([])
  const [pendingMoodChange, setPendingMoodChange] = useState<Array<{icon: string, name: string, image: string}> | null>(null)
  const [imageUpdateQueue, setImageUpdateQueue] = useState<number[]>([])
  const [isUpdatingImages, setIsUpdatingImages] = useState(false)

  const looks = [
    {
      title: 'Casual Dining',
      description: 'Perfect blend of comfort and flavour',
      materials: ['Fresh', 'Local', 'Seasonal'],
      icon: 'coffee'
    },
    {
      title: 'Fine Dining',
      description: 'Refined and sophisticated culinary experience',
      materials: ['Premium', 'Artisan', 'Curated'],
      icon: 'utensils'
    },
    {
      title: 'Brunch & Coffee',
      description: 'Relaxed mornings and specialty brews',
      materials: ['Single Origin', 'House Baked', 'Handcrafted'],
      icon: 'coffee'
    },
    {
      title: 'Classic Cafe',
      description: 'Timeless favourites and warm hospitality',
      materials: ['Traditional', 'Quality', 'Consistent'],
      icon: 'heart'
    }
  ]
  
  // Style categories with expanded data
  const styleCategories = [
    { 
      name: 'Fine Dining', 
      icon: 'briefcase', 
      description: 'Elegant and sophisticated',
      coverImage: '🍽️',
      images: ['🍽️', '🥂', '🍷', '🥩', '🦞', '🍾', '🕯️', '✨'],
      styles: ['Tasting Menu', 'Wine Pairing', 'Chef\'s Table', 'Seasonal Specials', 'Luxury Brunch', 'Private Dining', 'Date Night', 'Celebration']
    },
    { 
      name: 'Brunch', 
      icon: 'sun', 
      description: 'Laid-back and indulgent',
      coverImage: '🥞',
      images: ['🥞', '☕', '🍳', '🥐', '🍊', '🥑', '🍯', '🧇'],
      styles: ['Bottomless Brunch', 'Avocado Toast', 'Pancake Stack', 'Eggs Benedict', 'Fresh Juices', 'Pastry Board', 'Healthy Bowls', 'Weekend Vibes']
    },
    { 
      name: 'Coffee Culture', 
      icon: 'coffee', 
      description: 'Specialty brews and artisan roasts',
      coverImage: '☕',
      images: ['☕', '🥛', '🍵', '🧊', '🍫', '🥐', '📖', '💻'],
      styles: ['Single Origin', 'Cold Brew', 'Latte Art', 'Pour Over', 'Espresso Bar', 'Quiet Corner', 'Work Friendly', 'Meet & Greet']
    },
    { 
      name: 'Bar & Lounge', 
      icon: 'moon', 
      description: 'Cocktails and evening atmosphere',
      coverImage: '🍸',
      images: ['🍸', '🍷', '🥃', '🎵', '🌙', '🕯️', '🍹', '✨'],
      styles: ['Signature Cocktails', 'Wine List', 'Live Music', 'Happy Hour', 'Rooftop Vibes', 'Craft Spirits', 'Small Plates', 'Nightcap']
    }
  ]
  
  // Moodboard data
  const moodboardData = {
    inspiration: [
      { icon: '🎨', name: 'Art', image: '/assets/images/cafe/inspiration/art.jpg' },
      { icon: '✨', name: 'Sparkle', image: '/assets/images/cafe/inspiration/sparkle.jpg' },
      { icon: '🌟', name: 'Star', image: '/assets/images/cafe/inspiration/star.jpg' },
      { icon: '💫', name: 'Dizzy', image: '/assets/images/cafe/inspiration/dizzy.jpg' },
      { icon: '🔮', name: 'Crystal Ball', image: '/assets/images/cafe/inspiration/crystal-ball.jpg' },
      { icon: '🌈', name: 'Rainbow', image: '/assets/images/cafe/inspiration/rainbow.jpg' },
      { icon: '🎭', name: 'Theater', image: '/assets/images/cafe/inspiration/theatre.jpg' },
      { icon: '🎪', name: 'Circus', image: '/assets/images/cafe/inspiration/circus.jpg' }
    ],
    elegance: [
      { icon: '👑', name: 'Crown', image: '/assets/images/cafe/elegance/crown.jpg' },
      { icon: '💎', name: 'Gem', image: '/assets/images/cafe/elegance/gem.jpg' },
      { icon: '🕊️', name: 'Dove', image: '/assets/images/cafe/elegance/dove.jpg' },
      { icon: '🌹', name: 'Rose', image: '/assets/images/cafe/elegance/rose.jpg' },
      { icon: '🦢', name: 'Swan', image: '/assets/images/cafe/elegance/swan.jpg' },
      { icon: '💍', name: 'Ring', image: '/assets/images/cafe/elegance/ring.jpg' },
      { icon: '🥂', name: 'Champagne', image: '/assets/images/cafe/elegance/dress.jpg' },
      { icon: '🍽️', name: 'Fine Dining', image: '/assets/images/cafe/elegance/high-heel.jpg' }
    ],
    urban: [
      { icon: '🏙️', name: 'City', image: '/assets/images/cafe/urban/city.jpg' },
      { icon: '🚗', name: 'Car', image: '/assets/images/cafe/urban/car.jpg' },
      { icon: '🎵', name: 'Music', image: '/assets/images/cafe/urban/music.jpg' },
      { icon: '🎧', name: 'Headphones', image: '/assets/images/cafe/urban/headphones.jpg' },
      { icon: '☕', name: 'Coffee', image: '/assets/images/cafe/urban/skateboard.jpg' },
      { icon: '🎨', name: 'Art', image: '/assets/images/cafe/urban/art.jpg' },
      { icon: '💡', name: 'Light Bulb', image: '/assets/images/cafe/urban/light-bulb.jpg' },
      { icon: '⚡', name: 'Lightning', image: '/assets/images/cafe/urban/lightning.jpg' }
    ],
    nature: [
      { icon: '🌿', name: 'Herb', image: '/assets/images/cafe/nature/herb.jpg' },
      { icon: '🌸', name: 'Cherry Blossom', image: '/assets/images/cafe/nature/cherry-blossom.jpg' },
      { icon: '🌺', name: 'Hibiscus', image: '/assets/images/cafe/nature/hibiscus.jpg' },
      { icon: '🍃', name: 'Leaf', image: '/assets/images/cafe/nature/leaf.jpg' },
      { icon: '🌊', name: 'Wave', image: '/assets/images/cafe/nature/wave.jpg' },
      { icon: '🌅', name: 'Sunrise', image: '/assets/images/cafe/nature/sunrise.jpg' },
      { icon: '🌙', name: 'Moon', image: '/assets/images/cafe/nature/moon.jpg' },
      { icon: '⭐', name: 'Star', image: '/assets/images/cafe/nature/star.jpg' }
    ]
  }

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentLookIndex((prev) => (prev + 1) % 4)
    }, 4000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  // Functions for style categories
  const toggleStyleExpansion = (styleName: string) => {
    if (expandedStyle === styleName) {
      setExpandedStyle(null)
      setCurrentImageIndex(0)
    } else {
      setExpandedStyle(styleName)
      setCurrentImageIndex(0)
    }
  }

  const nextImage = () => {
    const currentStyle = styleCategories.find(style => style.name === expandedStyle)
    if (currentStyle) {
      setCurrentImageIndex((prev) => (prev + 1) % currentStyle.images.length)
    }
  }

  const prevImage = () => {
    const currentStyle = styleCategories.find(style => style.name === expandedStyle)
    if (currentStyle) {
      setCurrentImageIndex((prev) => (prev - 1 + currentStyle.images.length) % currentStyle.images.length)
    }
  }

  const goToImage = (index: number) => {
    setCurrentImageIndex(index)
  }

  const changeMood = (mood: string) => {
    if (mood === selectedMood || isUpdatingImages) return // Prevent multiple clicks during update
    
    const newImages = moodboardData[mood as keyof typeof moodboardData]
    setSelectedMood(mood)
    setMoodboardImages(newImages)
    
    // Generate random order for image updates
    const indices = Array.from({ length: newImages.length }, (_, i) => i)
    // Fisher-Yates shuffle for random order
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]]
    }
    
    setPendingMoodChange(newImages)
    setImageUpdateQueue(indices)
    setIsUpdatingImages(true)
  }

  // Handle staggered image updates
  useEffect(() => {
    if (!isUpdatingImages || imageUpdateQueue.length === 0 || !pendingMoodChange) {
      // Clean up when done
      if (isUpdatingImages && imageUpdateQueue.length === 0 && pendingMoodChange) {
        setIsUpdatingImages(false)
        setPendingMoodChange(null)
      }
      return
    }

    const indexToUpdate = imageUpdateQueue[0]
    const remainingQueue = imageUpdateQueue.slice(1)
    
    // Random delay between 100ms and 300ms for each image update
    const delay = Math.random() * 200 + 100
    const timeoutId = setTimeout(() => {
      setDisplayedImages((prev) => {
        const updated = [...prev]
        updated[indexToUpdate] = pendingMoodChange[indexToUpdate]
        return updated
      })
      
      setImageUpdateQueue(remainingQueue)
      
      // If this was the last image, clean up
      if (remainingQueue.length === 0) {
        setIsUpdatingImages(false)
        setPendingMoodChange(null)
      }
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [imageUpdateQueue, isUpdatingImages, pendingMoodChange])

  useEffect(() => {
    const initialImages = moodboardData.inspiration
    setMoodboardImages(initialImages)
    setDisplayedImages(initialImages)
  }, [])

  const [showBackButton, setShowBackButton] = useState(true)

  // Show/hide back button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      // Show button when at top (within 100px), hide when scrolled down
      setShowBackButton(scrollTop < 100)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial position
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen bg-unified relative overflow-hidden">
      {/* Navigation Back */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: showBackButton ? 1 : 0, x: showBackButton ? 0 : -50 }}
        transition={{ duration: 0.3 }}
        className="fixed top-20 left-8 z-50 pointer-events-none"
        style={{ pointerEvents: showBackButton ? 'auto' : 'none' }}
      >
        <Link href="/" className="group flex items-center space-x-2 text-primary-600 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-100 transition-colors duration-300">
          <motion.div
            whileHover={{ x: -5 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-lg font-medium">⟸</span>
          </motion.div>
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
      </motion.div>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center relative">
        <motion.div
          style={{ y, opacity }}
          className="text-center z-20 px-4"
        >
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-8xl sm:text-6xl md:text-8xl font-bold mb-6"
          >
            <span className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
              <HiOutlineShoppingBag className="w-32 h-32 sm:w-24 sm:h-24 md:w-40 md:h-40 text-neutral-700 dark:text-primary-200 drop-shadow-lg" aria-hidden="true" />
              <span className="text-gradient">SERVICES</span>
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-base sm:text-xl md:text-3xl text-neutral-800 dark:text-primary-200 mb-8 max-w-4xl mx-auto leading-relaxed px-4"
          >
            "comprehensive service offerings designed to bring luxury dining experiences to you"
          </motion.p>
          
        </motion.div>

        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-20 w-32 h-32 border border-primary-500/20 rounded-full animate-pulse-slow" />
          <div className="absolute bottom-20 right-20 w-24 h-24 border border-accent-500/20 rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-10 w-16 h-16 border border-primary-400/30 rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>
      </section>

      {/* Hybrid Services Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-16 text-center">
            <span className="text-primary-500 dark:text-primary-100">ᕼYᗷᖇIᗪ</span>{' '}
            <span className="text-neutral-700 dark:text-primary-300">Services</span>
          </h2>
          
          <div className="space-y-16 flex flex-col items-center">
            {/* Philosophy Item 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row items-center space-y-8 md:space-y-0 md:space-x-12"
            >
              <div className="flex flex-col items-center md:block">
                <div className="text-6xl font-bold text-primary-500 dark:text-primary-600 mb-4 md:hidden">01</div>
                <div className="flex-shrink-0 bg-gradient-to-br from-primary-800/30 to-primary-600/30 rounded-2xl border border-primary-500/30 overflow-hidden shadow-2xl p-8">
                  <img 
                    src="/assets/images/sections/cafe/philosophy-1.jpg" 
                    alt="Dine-In" 
                    className="w-24 h-24 object-cover rounded-xl"
                  />
                </div>
              </div>
              <div className="flex flex-col text-center md:text-left">
                <div className="text-6xl font-bold text-primary-500 dark:text-primary-600 mb-4 hidden md:block">01</div>
                <h3 className="text-3xl font-bold mb-2 text-neutral-850 dark:text-primary-50">Dine-In</h3>
                <p className="text-neutral-700 dark:text-primary-300 text-lg max-w-md">
                  Experience luxury dining in our elegant atmosphere. Savor every moment in a refined setting designed for exceptional culinary experiences.
                </p>
              </div>
            </motion.div>
            
            {/* Philosophy Item 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row items-center space-y-8 md:space-y-0 md:space-x-12"
            >
              <div className="flex flex-col items-center md:block">
                <div className="text-6xl font-bold text-primary-500 dark:text-primary-600 mb-4 md:hidden">02</div>
                <div className="flex-shrink-0 bg-gradient-to-br from-primary-600/30 to-primary-400/30 rounded-2xl border border-primary-400/30 overflow-hidden shadow-2xl p-8">
                  <img 
                    src="/assets/images/sections/cafe/philosophy-2.jpg" 
                    alt="Takeaway" 
                    className="w-24 h-24 object-cover rounded-xl"
                  />
                </div>
              </div>
              <div className="flex flex-col text-center md:text-left">
                <div className="text-6xl font-bold text-primary-500 dark:text-primary-600 mb-4 hidden md:block">02</div>
                <h3 className="text-3xl font-bold mb-2 text-neutral-850 dark:text-primary-50">Takeaway</h3>
                <p className="text-neutral-700 dark:text-primary-300 text-lg max-w-md">
                Quick service for on-the-go luxury. Enjoy our premium offerings wherever you are, with the same quality and excellence.
                </p>
              </div>
            </motion.div>
            
            {/* Philosophy Item 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row items-center space-y-8 md:space-y-0 md:space-x-12"
            >
              <div className="flex flex-col items-center md:block">
                <div className="text-6xl font-bold text-primary-500 dark:text-primary-600 mb-4 md:hidden">03</div>
                <div className="flex-shrink-0 bg-gradient-to-br from-primary-400/30 to-primary-200/30 rounded-2xl border border-primary-200/30 overflow-hidden shadow-2xl p-8">
                  <img 
                    src="/assets/images/sections/cafe/philosophy-3.jpg" 
                    alt="Delivery" 
                    className="w-24 h-24 object-cover rounded-xl"
                  />
                </div>
              </div>
              <div className="flex flex-col text-center md:text-left">
                <div className="text-6xl font-bold text-primary-500 dark:text-primary-600 mb-4 hidden md:block">03</div>
                <h3 className="text-3xl font-bold mb-2 text-neutral-850 dark:text-primary-50">Delivery</h3>
                <p className="text-neutral-700 dark:text-primary-300 text-lg max-w-md">
                Luxury delivered to your doorstep. Experience our premium offerings in the comfort of your own space, with the same excellence and care.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ⏣ Our MENU */}
      <CafeMenuSection />

      {/* Moodboard Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <h2 className="text-5xl md:text-6xl font-bold text-center mb-16">
            <span className="text-primary-500 dark:text-primary-100">ᗰOOᗪᗷOᗩᖇᗪ</span>{' '}
            <span className="text-neutral-700 dark:text-primary-300">Inspiration</span>
          </h2>
          
          <div className="glass-effect p-8 rounded-2xl">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold mb-4 text-neutral-850 dark:text-primary-50">
                Visual Inspiration
              </h3>
              <p className="text-neutral-700 dark:text-primary-300">
                Curated menu collections that capture different tastes and culinary aesthetics
              </p>
            </div>
            
            {/* Interactive Moodboard */}
            <div className="space-y-6">
              {/* Mood Selector */}
              <div className="flex justify-center flex-wrap gap-3">
                {Object.keys(moodboardData).map((mood) => (
                  <button
                    key={mood}
                    onClick={() => changeMood(mood)}
                    disabled={isUpdatingImages}
                    className={`btn transition-all duration-300 capitalize px-5 py-2 ${
                      selectedMood === mood
                        ? 'btn-secondary'
                        : 'btn-outline btn-hover-secondary-filled'
                    } ${isUpdatingImages ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
              
              {/* Moodboard Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-4 px-4 md:px-0">
                {displayedImages.map((item, index) => (
                  <motion.div
                    key={`${selectedMood}-${index}-${item.image}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="aspect-square bg-gradient-to-br from-primary-700/30 to-accent-700/30 rounded-xl border border-primary-500/30 flex items-center justify-center cursor-pointer group hover:shadow-xl transition-all duration-300 overflow-hidden relative"
                  >
                    <AnimatePresence mode="sync">
                      <motion.img
                        key={`${selectedMood}-${index}-${item.image}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover rounded-lg group-hover:scale-125 transition-transform duration-300 absolute inset-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    </AnimatePresence>
                    {/* Fallback Placeholder */}
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{display: 'none'}}
                    >
                      <span className="text-4xl group-hover:scale-125 transition-transform duration-300">
                        {item.icon}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Mood Description */}
              <div className="text-center">
                <p className="text-neutral-700 dark:text-primary-300 text-sm">
                  {selectedMood === 'inspiration' && 'Different material surface textures'}
                  {selectedMood === 'elegance' && 'Sophisticated luxury and refined beauty'}
                  {selectedMood === 'urban' && 'City vibes and contemporary culture'}
                  {selectedMood === 'nature' && 'Organic elements and natural harmony'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Shop Video Gallery Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto"
        >
          <h2 className="text-5xl md:text-6xl font-bold text-center mb-16">
            <span className="text-primary-500 dark:text-primary-100">HEBREWS</span>{' '}
            <span className="text-neutral-700 dark:text-primary-300">Video Gallery</span>{' '}
          </h2>
          <CafeVideoSection />
        </motion.div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            <span className="text-neutral-700 dark:text-primary-300">Ready to</span>{' '}
            <span className="text-primary-500 dark:text-primary-100">ᗪIᑎE</span>{' '}
            <span className="text-neutral-700 dark:text-primary-300">in Luxury?</span>
          </h2>
          <p className="text-xl text-neutral-700 dark:text-primary-300 mb-8">
            Explore our collection of exquisite menu offerings and for any questions, contact us!
          </p>
          <Link href="/#contact-section">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-outline btn-hover-secondary-filled text-lg px-8 py-4"
            >
              Contact Us
            </motion.button>
          </Link>
        </motion.div>
      </section>
    </div>
  )
}