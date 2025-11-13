'use client'

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { Pause, Play } from 'lucide-react'
import { HiMiniShoppingBag } from 'react-icons/hi2'
import FashionVideoSection from '@/components/sections/FashionVideoSection'
import FashionServices from '@/components/sections/FashionServices'

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

  const looks = [
    {
      title: 'Casual Elegance',
      description: 'Perfect blend of comfort and style',
      materials: ['Denim', 'Cotton', 'Linen'],
      icon: 'shirt'
    },
    {
      title: 'Business Professional',
      description: 'Sharp and sophisticated office attire',
      materials: ['Wool', 'Silk', 'Cotton'],
      icon: 'briefcase'
    },
    {
      title: 'Urban Street',
      description: 'Edgy and contemporary street style',
      materials: ['Leather', 'Denim', 'Mesh'],
      icon: 'headphones'
    },
    {
      title: 'Retro Classic',
      description: 'Timeless vintage-inspired looks',
      materials: ['Tweed', 'Velvet', 'Lace'],
      icon: 'eye'
    }
  ]
  
  // Style categories with expanded data
  const styleCategories = [
    { 
      name: 'Classy', 
      icon: 'briefcase', 
      description: 'Elegant and sophisticated',
      coverImage: '👔',
      images: ['👔', '👗', '👠', '💼', '🎩', '🧥', '👛', '👜'],
      styles: ['Business Formal', 'Evening Wear', 'Cocktail Attire', 'Professional Look', 'Luxury Casual', 'Executive Style', 'Boardroom Ready', 'Gala Glamour']
    },
    { 
      name: 'Retro', 
      icon: 'eye', 
      description: 'Vintage and timeless',
      coverImage: '🕶️',
      images: ['🕶️', '👗', '👒', '🧥', '👠', '👔', '👜', '💍'],
      styles: ['1950s Classic', '1960s Mod', '1970s Bohemian', '1980s Power', '1990s Minimalist', 'Art Deco', 'Victorian Elegance', 'Roaring Twenties']
    },
    { 
      name: 'Modern', 
      icon: 'zap', 
      description: 'Contemporary and trendy',
      coverImage: '🚀',
      images: ['🚀', '👕', '👖', '👟', '👜', '🧢', '👓', '⌚'],
      styles: ['Modern Minimalist', 'Tech Wear', 'Athleisure', 'Street Fashion', 'Sustainable Style', 'Smart Casual', 'Urban Professional', 'Digital Nomad']
    },
    { 
      name: 'Streetwear', 
      icon: 'headphones', 
      description: 'Urban and casual',
      coverImage: '🎧',
      images: ['🎧', '👕', '👖', '👟', '🧢', '👜', '⌚', '💎'],
      styles: ['Urban Casual', 'Skate Style', 'Hip Hop Fashion', 'Street Luxe', 'Tech Street', 'Graffiti Inspired', 'Underground', 'City Vibes']
    }
  ]
  
  // Moodboard data
  const moodboardData = {
    inspiration: [
      { icon: '🎨', name: 'Art', image: '/assets/images/fashion/inspiration/art.jpg' },
      { icon: '✨', name: 'Sparkle', image: '/assets/images/fashion/inspiration/sparkle.jpg' },
      { icon: '🌟', name: 'Star', image: '/assets/images/fashion/inspiration/star.jpg' },
      { icon: '💫', name: 'Dizzy', image: '/assets/images/fashion/inspiration/dizzy.jpg' },
      { icon: '🔮', name: 'Crystal Ball', image: '/assets/images/fashion/inspiration/crystal-ball.jpg' },
      { icon: '🌈', name: 'Rainbow', image: '/assets/images/fashion/inspiration/rainbow.jpg' },
      { icon: '🎭', name: 'Theater', image: '/assets/images/fashion/inspiration/theatre.jpg' },
      { icon: '🎪', name: 'Circus', image: '/assets/images/fashion/inspiration/circus.jpg' }
    ],
    elegance: [
      { icon: '👑', name: 'Crown', image: '/assets/images/fashion/elegance/crown.jpg' },
      { icon: '💎', name: 'Gem', image: '/assets/images/fashion/elegance/gem.jpg' },
      { icon: '🕊️', name: 'Dove', image: '/assets/images/fashion/elegance/dove.jpg' },
      { icon: '🌹', name: 'Rose', image: '/assets/images/fashion/elegance/rose.jpg' },
      { icon: '🦢', name: 'Swan', image: '/assets/images/fashion/elegance/swan.jpg' },
      { icon: '💍', name: 'Ring', image: '/assets/images/fashion/elegance/ring.jpg' },
      { icon: '👗', name: 'Dress', image: '/assets/images/fashion/elegance/dress.jpg' },
      { icon: '👠', name: 'High Heel', image: '/assets/images/fashion/elegance/high-heel.jpg' }
    ],
    urban: [
      { icon: '🏙️', name: 'City', image: '/assets/images/fashion/urban/city.jpg' },
      { icon: '🚗', name: 'Car', image: '/assets/images/fashion/urban/car.jpg' },
      { icon: '🎵', name: 'Music', image: '/assets/images/fashion/urban/music.jpg' },
      { icon: '🎧', name: 'Headphones', image: '/assets/images/fashion/urban/headphones.jpg' },
      { icon: '🛹', name: 'Skateboard', image: '/assets/images/fashion/urban/skateboard.jpg' },
      { icon: '🎨', name: 'Art', image: '/assets/images/fashion/urban/art.jpg' },
      { icon: '💡', name: 'Light Bulb', image: '/assets/images/fashion/urban/light-bulb.jpg' },
      { icon: '⚡', name: 'Lightning', image: '/assets/images/fashion/urban/lightning.jpg' }
    ],
    nature: [
      { icon: '🌿', name: 'Herb', image: '/assets/images/fashion/nature/herb.jpg' },
      { icon: '🌸', name: 'Cherry Blossom', image: '/assets/images/fashion/nature/cherry-blossom.jpg' },
      { icon: '🌺', name: 'Hibiscus', image: '/assets/images/fashion/nature/hibiscus.jpg' },
      { icon: '🍃', name: 'Leaf', image: '/assets/images/fashion/nature/leaf.jpg' },
      { icon: '🌊', name: 'Wave', image: '/assets/images/fashion/nature/wave.jpg' },
      { icon: '🌅', name: 'Sunrise', image: '/assets/images/fashion/nature/sunrise.jpg' },
      { icon: '🌙', name: 'Moon', image: '/assets/images/fashion/nature/moon.jpg' },
      { icon: '⭐', name: 'Star', image: '/assets/images/fashion/nature/star.jpg' }
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
    setSelectedMood(mood)
    setMoodboardImages(moodboardData[mood as keyof typeof moodboardData])
  }

  useEffect(() => {
    setMoodboardImages(moodboardData.inspiration)
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen bg-unified relative overflow-hidden">
      {/* Navigation Back */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="fixed top-20 left-8 z-50"
      >
        <Link href="/" className="group">
          <div className="flex items-center space-x-2 text-primary-300 hover:text-primary-900 transition-colors duration-300">
            <motion.div
              whileHover={{ x: -5 }}
              transition={{ duration: 0.2 }}
            >
              ⟸
            </motion.div>
            <span className="text-sm font-medium">Back to Portals</span>
          </div>
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
            className="text-8xl md:text-8xl font-bold mb-6"
          >
            <span className="inline-flex items-center justify-center gap-4">
              <HiMiniShoppingBag className="w-14 h-14 text-primary-200 drop-shadow-lg" aria-hidden="true" />
              <span className="text-gradient">ᔕᕼOᑭ</span>
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-2xl md:text-3xl text-primary-200 mb-8 max-w-4xl mx-auto leading-relaxed"
          >
            "Where thrifted treasures meet fresh style finds"
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="text-lg text-primary-300 max-w-3xl mx-auto"
          >
            Discover unique pieces that blend vintage charm with contemporary style. 
            From carefully curated thrifted gems to fresh new arrivals, we help you 
            build a wardrobe that's authentically yours.
          </motion.div>
        </motion.div>

        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-20 w-32 h-32 border border-primary-500/20 rounded-full animate-pulse-slow" />
          <div className="absolute bottom-20 right-20 w-24 h-24 border border-accent-500/20 rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-10 w-16 h-16 border border-primary-400/30 rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>
      </section>

      {/* Shop Philosophy Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-16 text-center">
            <span className="text-primary-400">ᔕᕼOᑭ</span> Philosophy
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
              <div className="flex-shrink-0 bg-gradient-to-br from-primary-800/30 to-primary-600/30 rounded-2xl border border-primary-500/30 overflow-hidden shadow-2xl p-8">
                <img 
                  src="/assets/images/sections/fashion/philosophy-1.jpg" 
                  alt="Self-Expression" 
                  className="w-24 h-24 object-cover rounded-xl"
                />
              </div>
              <div className="flex flex-col text-center md:text-left">
                <div className="text-6xl font-bold text-primary-400 mb-4">01</div>
                <h3 className="text-3xl font-bold mb-2 text-white dark:text-neutral-100">Sustainable Style</h3>
                <p className="text-primary-200 text-lg max-w-md">
                  Every thrifted piece has a story, and every new find adds to yours. 
                  We believe in fashion that's both beautiful and responsible.
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
              <div className="flex-shrink-0 bg-gradient-to-br from-primary-600/30 to-primary-400/30 rounded-2xl border border-primary-400/30 overflow-hidden shadow-2xl p-8">
                <img 
                  src="/assets/images/sections/fashion/philosophy-2.jpg" 
                  alt="Confidence" 
                  className="w-24 h-24 object-cover rounded-xl"
                />
              </div>
              <div className="flex flex-col text-center md:text-left">
                <div className="text-6xl font-bold text-primary-300 mb-4">02</div>
                <h3 className="text-3xl font-bold mb-2 text-white dark:text-neutral-100">Unique Finds</h3>
                <p className="text-primary-200 text-lg max-w-md">
                  From vintage treasures to contemporary pieces, we curate collections 
                  that help you stand out with pieces that can't be found everywhere.
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
              <div className="flex-shrink-0 bg-gradient-to-br from-primary-400/30 to-primary-200/30 rounded-2xl border border-primary-200/30 overflow-hidden shadow-2xl p-8">
                <img 
                  src="/assets/images/sections/fashion/philosophy-3.jpg" 
                  alt="Individuality" 
                  className="w-24 h-24 object-cover rounded-xl"
                />
              </div>
              <div className="flex flex-col text-center md:text-left">
                <div className="text-6xl font-bold text-primary-200 mb-4">03</div>
                <h3 className="text-3xl font-bold mb-2 text-white dark:text-neutral-100">Personal Style</h3>
                <p className="text-primary-200 text-lg max-w-md">
                  Whether you love classic vintage or modern minimalism, we help you 
                  discover and develop your authentic style through carefully selected pieces.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ⏣ Our Services */}
      <FashionServices />

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
            <span className="text-primary-400">ᗰOOᗪᗷOᗩᖇᗪ

            </span> Inspiration
          </h2>
          
          <div className="glass-effect p-8 rounded-2xl">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold mb-4 text-white dark:text-neutral-100">
                Visual Inspiration
              </h3>
              <p className="text-primary-200">
                Curated collections that capture different moods and aesthetics
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
                    className={`btn transition-all duration-300 capitalize px-5 py-2 ${
                      selectedMood === mood
                        ? 'btn-secondary'
                        : 'btn-outline btn-hover-secondary-filled'
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
              
              {/* Moodboard Grid */}
              <div className="grid grid-cols-4 gap-4">
                {moodboardImages.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="aspect-square bg-gradient-to-br from-primary-700/30 to-accent-700/30 rounded-xl border border-primary-500/30 flex items-center justify-center cursor-pointer group hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover rounded-lg group-hover:scale-125 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
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
                <p className="text-primary-300 text-sm">
                  {selectedMood === 'inspiration' && 'Creative sparks and artistic vision'}
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
            <span className="text-primary-400">ᔕᕼOᑭ</span> Video Gallery
          </h2>
          <FashionVideoSection />
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
            Ready to <span className="text-primary-400">Shop</span> Your Style?
          </h2>
          <p className="text-xl text-primary-300 mb-8">
            Browse our collection of thrifted treasures and fresh finds to create your perfect look.
          </p>
          <Link href="/#contact-section">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-outline btn-hover-secondary-filled text-lg px-8 py-4"
            >
              Browse Collection
            </motion.button>
          </Link>
        </motion.div>
      </section>
    </div>
  )
}