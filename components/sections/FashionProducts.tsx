'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Plus, Minus, Quote } from 'lucide-react'
import Link from 'next/link'

interface ProductSubcategory {
  name: string
  slug: string
}

interface Product { 
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

const products: Product[] = [
  { 
    id: 1, 
    number: '01', 
    title: 'Barista', 
    description: 'Discover our premium coffee and beverage selection, from expertly crafted hot drinks to refreshing cold creations. Customize with milk types and strength options.', 
    image: '/assets/images/products-sections/fashion/shirts.jpg',
    slug: 'barista',
    subcategories: [
      { name: 'Hot Beverages', slug: 'hot' },
      { name: 'Cold Beverages', slug: 'cold' },
      { name: 'Specialty Coffee', slug: 'specialty' },
      { name: 'Tea Selection', slug: 'tea' }
    ],
    quote: {
      text: 'We are not in the coffee business serving people, we are in the people business serving coffee',
      author: 'Howard Schultz'
    }
  },
  { 
    id: 2, 
    number: '02', 
    title: 'Bar', 
    description: 'Indulge in our curated selection of cocktails and wines. Each drink crafted with precision, with options for no-sugar cocktails and premium wine pairings.', 
    image: '/assets/images/products-sections/fashion/tees.jpg',
    slug: 'bar',
    subcategories: [
      { name: 'Cocktails', slug: 'cocktails' },
      { name: 'Wines', slug: 'wines' },
      { name: 'Premium Spirits', slug: 'spirits' },
      { name: 'Signature Drinks', slug: 'signature' }
    ],
    quote: {
      text: 'Oh, you hate your job? There is a support group for that called everybody, and they meet regularly at the bar',
      author: 'Drew Carey'
    }
  },
  { 
    id: 3, 
    number: '03', 
    title: 'Kitchen', 
    description: 'Savor our expertly prepared dishes from the grill, breakfast favorites, and main courses. Customize steaks with temperature, sauce, and side options.', 
    image: '/assets/images/products-sections/fashion/outerwear.jpg',
    slug: 'kitchen',
    subcategories: [
      { name: 'Grill', slug: 'grill' },
      { name: 'Breakfast', slug: 'breakfast' },
      { name: 'Mains', slug: 'mains' },
      { name: 'Specials', slug: 'specials' }
    ],
    quote: {
      text: 'If you can organise your kitchen, you can organise your life',
      author: 'Louis Parrish'
    }
  },
  { 
    id: 4, 
    number: '04', 
    title: 'Bakery', 
    description: 'Delight in our fresh-baked pastries, breads, and confections. Perfect for breakfast combos or as the perfect ending to your dining experience.', 
    image: '/assets/images/products-sections/fashion/bottoms.jpg',
    slug: 'bakery',
    subcategories: [
      { name: 'Pastries', slug: 'pastries' },
      { name: 'Breads', slug: 'breads' },
      { name: 'Desserts', slug: 'desserts' },
      { name: 'Breakfast Items', slug: 'breakfast-items' }
    ],
    quote: {
      text: 'There are people in the world so hungry, that God cannot appear to them except in the form of bread',
      author: 'Mahatma Gandhi'
    }
  }
]

export default function FashionProducts() {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [hoveredThumbnail, setHoveredThumbnail] = useState<{serviceId: number, thumbIndex: number} | null>(null)
  
  const toggle = (id: number) => setExpandedId(expandedId === id ? null : id)
  
  return (
    <section id="our-products" className="py-20 px-4">
      <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} viewport={{ once: true }} className="max-w-7xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-bold text-center mb-16">
          <span className="text-primary-500 dark:text-primary-100">⏣ Our</span>{' '}
          <span className="text-neutral-700 dark:text-primary-300"> Menu</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto px-8">
          {products.map((s, i) => { 
            const isRight = i % 2 === 1
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: i * 0.1 }} viewport={{ once: true }} className={`flex flex-col ${isRight ? 'items-end' : 'items-start'}`}>
                <div className={`flex flex-col space-y-6 ${isRight ? 'items-end' : 'items-start'}`}>
                  <Link href={`/products/${s.slug}`} className={`flex flex-col ${isRight ? 'text-right items-end' : 'text-left items-start'} group cursor-pointer`}>
                    <div className="text-6xl font-bold text-neutral-700 dark:text-primary-400">{s.number}</div>
                    <h3 className="text-3xl font-bold mt-2 text-primary-900 dark:text-primary-50 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors duration-300">{s.title}</h3>
                  </Link>
                  <Link href={`/products/${s.slug}`} className={`bg-gradient-to-br from-primary-800/30 to-primary-600/30 rounded-2xl border border-primary-500/30 overflow-hidden shadow-2xl w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[352px] md:h-[352px] aspect-square flex-shrink-0 flex items-center justify-center p-4 ${isRight ? 'ml-auto md:ml-0' : 'mr-auto md:mr-0'} group cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300`}>
                    <div className="bg-primary-900/20 rounded-xl w-full h-full aspect-square flex-shrink-0 flex items-center justify-center overflow-hidden">
                      <img src={s.image} alt={s.title} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300" onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; const f = (t.parentElement?.nextElementSibling as HTMLElement); if (f) f.style.display = 'flex' }} />
                    </div>
                  </Link>
                  <motion.div className={`flex flex-col ${isRight ? 'text-right items-end' : 'text-left items-start'}`}>
                    <p className="text-neutral-700 dark:text-primary-300 leading-relaxed mt-2 max-w-md">{s.description}</p>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => toggle(s.id)} className="btn btn-outline btn-hover-secondary-filled inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 mt-4">
                      <span>{expandedId === s.id ? 'Minimize Categories' : 'Select Categories'}</span>
                      <AnimatePresence mode="wait">{expandedId === s.id ? <motion.div key="m" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}><Minus size={20} /></motion.div> : <motion.div key="p" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}><Plus size={20} /></motion.div>}</AnimatePresence>
                    </motion.button>
                  </motion.div>
                </div>
                <AnimatePresence>
                  {expandedId === s.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden mt-4">
                      <div className="bg-primary-800/30 dark:bg-primary-900/40 rounded-xl p-3 sm:p-6 border border-primary-500/20 dark:border-primary-400/30">
                        {/* Thumbnail Images */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 justify-items-center">
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
                                <div className="bg-primary-900/20 rounded-lg h-24 w-24 sm:h-40 sm:w-40 md:h-48 md:w-48 flex items-center justify-center border border-primary-500/20 overflow-hidden shadow-lg hover:shadow-none transition-all duration-300 cursor-pointer group">
                            <img 
                              src={`/assets/images/products-sections/fashion/${s.slug}/thumb${thumbIndex}.jpg`}
                              alt={`${subcategory.name} - ${s.title}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = `/assets/images/products-sections/fashion/${s.slug}/thumb${thumbIndex}.svg`
                              }}
                            />
                                  <div className="hidden text-neutral-800 dark:text-primary-400 text-sm items-center justify-center w-full h-full">
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
                                        className="text-neutral-850 dark:text-white font-bold text-xs sm:text-base md:text-lg"
                                      >
                                        {subcategory.name}
                                      </motion.span>
                                      <motion.div
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.15 }}
                                        className="btn btn-outline btn-hover-secondary-filled flex items-center justify-center text-center px-3 py-1 md:px-6 md:py-2 text-xs md:text-sm font-medium"
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
                        <div className="mt-2 pt-4 border-t border-primary-500/20">
                          <blockquote className="text-center max-w-full sm:max-w-md md:max-w-lg mx-auto">
                            <Quote className="w-8 h-8 mx-auto mb-4 text-primary-400/50" />
                            <p className="text-neutral-700 dark:text-primary-400 italic text-lg md:text-xl mb-3">
                              {s.quote.text}
                            </p>
                            <span 
                              className="text-neutral-700 dark:text-primary-300 text-sm font-medium inline-block"
                            >
                              — {s.quote.author}
                            </span>
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


