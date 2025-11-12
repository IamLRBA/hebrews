'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Plus, Minus, Quote } from 'lucide-react'
import Link from 'next/link'

interface ProductSubcategory {
  name: string
  slug: string
}

interface Service { 
  id: number
  number: string
  title: string
  description: string
  image: string
  slug: string
  subcategories: ProductSubcategory[]
  quote: {
    text: string
    author: string
  }
}

const services: Service[] = [
  { 
    id: 1, 
    number: '01', 
    title: 'Shirts', 
    description: 'Discover our collection of elegant and versatile shirts, from classic button-downs to modern casual styles that complement any wardrobe.', 
    image: '/assets/images/services/fashion/personal-styling.jpg',
    slug: 'shirts',
    subcategories: [
      { name: 'Gentle', slug: 'gentle' },
      { name: 'Checked', slug: 'checked' },
      { name: 'Textured', slug: 'textured' },
      { name: 'Denim', slug: 'denim' }
    ],
    quote: {
      text: 'A shirt that fits well is worth more than one that costs a fortune.',
      author: 'Tommy Hilfiger'
    }
  },
  { 
    id: 2, 
    number: '02', 
    title: 'Tees', 
    description: 'Comfortable and stylish t-shirts in various designs, materials, and fits perfect for everyday wear or casual outings.', 
    image: '/assets/images/services/fashion/wardrobe-consultation.jpg',
    slug: 'tees',
    subcategories: [
      { name: 'Plain', slug: 'plain' },
      { name: 'Graphic', slug: 'graphic' },
      { name: 'Collared', slug: 'collared' },
      { name: 'Sporty', slug: 'sporty' }
    ],
    quote: {
      text: 'Less is more when you\'re wearing the right t-shirt.',
      author: 'Ralph Lauren'
    }
  },
  { 
    id: 3, 
    number: '03', 
    title: 'Coats', 
    description: 'Stylish outerwear to keep you warm and fashionable, from classic trench coats to modern jackets for all seasons.', 
    image: '/assets/images/services/fashion/event-styling.jpg',
    slug: 'coats',
    subcategories: [
      { name: 'Sweater', slug: 'sweater' },
      { name: 'Hoodie', slug: 'hoodie' },
      { name: 'Coat', slug: 'coat' },
      { name: 'Jacket', slug: 'jacket' }
    ],
    quote: {
      text: 'A coat should keep you warm, but a great coat should make you feel like you can conquer the world.',
      author: 'Coco Chanel'
    }
  },
  { 
    id: 4, 
    number: '04', 
    title: 'Pants and Shorts', 
    description: 'Complete your look with our selection of pants and shorts, ranging from formal trousers to relaxed casual styles.', 
    image: '/assets/images/services/fashion/shopping-assistance.jpg',
    slug: 'pants-and-shorts',
    subcategories: [
      { name: 'Gentle', slug: 'gentle' },
      { name: 'Denim', slug: 'denim' },
      { name: 'Cargo', slug: 'cargo' },
      { name: 'Sporty', slug: 'sporty' }
    ],
    quote: {
      text: 'The right pair of pants can make you feel confident and ready to take on anything.',
      author: 'Karl Lagerfeld'
    }
  },
  { 
    id: 5, 
    number: '05', 
    title: 'Footwear', 
    description: 'Step out in style with our curated footwear collection including sneakers, boots, and more for every occasion.', 
    image: '/assets/images/services/fashion/style-education.jpg',
    slug: 'footwear',
    subcategories: [
      { name: 'Gentle', slug: 'gentle' },
      { name: 'Sneakers', slug: 'sneakers' },
      { name: 'Sandals', slug: 'sandals' },
      { name: 'Boots', slug: 'boots' }
    ],
    quote: {
      text: 'Walk like you have a destination and shoes that can take you there.',
      author: 'Manolo Blahnik'
    }
  },
  { 
    id: 6, 
    number: '06', 
    title: 'Accessories', 
    description: 'Add the perfect finishing touches with our range of accessories including bags, belts, and other essential styling elements.', 
    image: '/assets/images/services/fashion/virtual-styling.jpg',
    slug: 'accessories',
    subcategories: [
      { name: 'Rings & Necklaces', slug: 'rings-necklaces' },
      { name: 'Shades & Glasses', slug: 'shades-glasses' },
      { name: 'Bracelets & Watches', slug: 'bracelets-watches' },
      { name: 'Decor', slug: 'decor' }
    ],
    quote: {
      text: 'Accessories are like vitamins to fashion – they enhance the outfit.',
      author: 'Anna Dello Russo'
    }
  }
]

export default function FashionServices() {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [hoveredThumbnail, setHoveredThumbnail] = useState<{serviceId: number, thumbIndex: number} | null>(null)
  
  const toggle = (id: number) => setExpandedId(expandedId === id ? null : id)
  
  return (
    <section className="py-20 px-4">
      <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} viewport={{ once: true }} className="max-w-7xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-bold text-center mb-16">⏣ Our <span className="text-primary-400">Services</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto px-8">
          {services.map((s, i) => { 
            const isRight = i % 2 === 1
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: i * 0.1 }} viewport={{ once: true }} className={`flex flex-col ${isRight ? 'items-end' : 'items-start'}`}>
                <div className="flex flex-col space-y-6">
                  <div className="bg-gradient-to-br from-primary-800/30 to-primary-600/30 rounded-2xl border border-primary-500/30 overflow-hidden shadow-2xl p-4">
                    <div className="bg-primary-900/20 rounded-xl w-[320px] h-[320px] flex items-center justify-center overflow-hidden">
                      <img src={s.image} alt={s.title} className="max-w-full max-h-full object-contain" onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; const f = (t.parentElement?.nextElementSibling as HTMLElement); if (f) f.style.display = 'flex' }} />
                    </div>
                  </div>
                  <motion.div className={`flex flex-col ${isRight ? 'text-right items-end' : 'text-left items-start'}`}>
                    <div className="text-6xl font-bold text-primary-400">{s.number}</div>
                    <h3 className="text-3xl font-bold mt-2 text-white">{s.title}</h3>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => toggle(s.id)} className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary-500/20 to-accent-500/20 text-primary-300 hover:text-white border border-primary-500/30 rounded-full px-6 py-3 transition-all duration-300 hover:bg-gradient-to-r hover:from-primary-500/30 hover:to-accent-500/30 mt-4">
                      <span>{expandedId === s.id ? 'Read Less' : 'Read More'}</span>
                      <AnimatePresence mode="wait">{expandedId === s.id ? <motion.div key="m" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}><Minus size={20} /></motion.div> : <motion.div key="p" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}><Plus size={20} /></motion.div>}</AnimatePresence>
                    </motion.button>
                  </motion.div>
                </div>
                <AnimatePresence>
                  {expandedId === s.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden mt-4">
                      <div className="bg-primary-800/30 rounded-xl p-6 border border-primary-500/20">
                        <p className="text-primary-200 leading-relaxed mb-6 text-center">{s.description}</p>
                        
                        {/* Thumbnail Images */}
                        <div className="grid grid-cols-2 gap-4 justify-items-center">
                          {[1, 2, 3, 4].map((thumbIndex) => {
                            const subcategory = s.subcategories[thumbIndex - 1]
                            const isHovered = hoveredThumbnail?.serviceId === s.id && hoveredThumbnail?.thumbIndex === thumbIndex
                            
                            return (
                              <Link 
                                key={thumbIndex}
                                href={`/products/${s.slug}#${subcategory.slug}`}
                                className="relative group"
                                onMouseEnter={() => setHoveredThumbnail({ serviceId: s.id, thumbIndex })}
                                onMouseLeave={() => setHoveredThumbnail(null)}
                              >
                                <div className="bg-primary-900/20 rounded-lg h-48 w-48 flex items-center justify-center border border-primary-500/20 overflow-hidden shadow-lg hover:shadow-none transition-all duration-300 cursor-pointer group">
                            <img 
                              src={`/assets/images/services/fashion/${s.slug}/thumb${thumbIndex}.jpg`}
                              alt={`${subcategory.name} - ${s.title}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = `/assets/images/services/fashion/${s.slug}/thumb${thumbIndex}.svg`
                              }}
                            />
                                  <div className="hidden text-primary-400 text-sm items-center justify-center w-full h-full">
                                    {subcategory.name}
                                  </div>
                                </div>
                                
                                {/* Hover Overlay */}
                                <AnimatePresence>
                                  {isHovered && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center space-y-3 rounded-lg"
                                    >
                                      <motion.span
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                        className="text-white font-bold text-lg"
                                      >
                                        {subcategory.name}
                                      </motion.span>
                                      <motion.div
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.15 }}
                                        className="btn btn-secondary justify-center px-6 py-2 text-sm font-medium"
                                      >
                                        View Collection
                                      </motion.div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </Link>
                            )
                          })}
                        </div>
                        
                        {/* Quote Section */}
                        <div className="mt-8 pt-8 border-t border-primary-500/20">
                          <blockquote className="text-center">
                            <Quote className="w-8 h-8 mx-auto mb-4 text-primary-400/50" />
                            <p className="text-primary-300 italic text-lg md:text-xl mb-3">
                              {s.quote.text}
                            </p>
                            <footer className="text-primary-400 text-sm font-medium">
                              — {s.quote.author}
                            </footer>
                          </blockquote>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}


