'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star } from 'lucide-react'
import { AuthManager } from '@/lib/auth'

interface Testimonial {
  id: number | string
  text: string
  fullText: string
  author: string
  company: string
  image: string
  rating: number
}

const defaultTestimonials: Testimonial[] = [
  { id: 1, text: "FusionCRAFT STUDIOS has an incredible eye for unique fashion finds. Their thrifted pieces are always in perfect condition and their styling advice is spot-on.", fullText: "FusionCRAFT STUDIOS has an incredible eye for unique fashion finds. Their thrifted pieces are always in perfect condition and their styling advice is spot-on. I've built most of my wardrobe from their curated collection, and every piece tells a story. The quality and uniqueness of their items is unmatched.", author: "Sarah M.", company: "Fashion Enthusiast", image: "/assets/images/testimonials/sarah-m.jpg", rating: 5 },
  { id: 2, text: "Their sustainable fashion approach is refreshing. They've helped me discover my personal style while being environmentally conscious.", fullText: "Their sustainable fashion approach is refreshing. They've helped me discover my personal style while being environmentally conscious. The team understands that fashion should be both beautiful and responsible. Every piece I've purchased has been a perfect fit for my lifestyle and values.", author: "Emma K.", company: "Style Consultant", image: "/assets/images/testimonials/emma-k.jpg", rating: 5 },
  { id: 3, text: "The blend of vintage and contemporary pieces they offer is exactly what I was looking for. Their curation is impeccable.", fullText: "The blend of vintage and contemporary pieces they offer is exactly what I was looking for. Their curation is impeccable. FusionCRAFT STUDIOS has helped me create a wardrobe that's both timeless and trendy. Their attention to detail and quality is evident in every piece they select.", author: "Jessica L.", company: "Fashion Blogger", image: "/assets/images/testimonials/jessica-l.jpg", rating: 5 },
  { id: 4, text: "Their styling consultations have transformed how I approach fashion. I now feel confident in every outfit I wear.", fullText: "Their styling consultations have transformed how I approach fashion. I now feel confident in every outfit I wear. The team at FusionCRAFT STUDIOS doesn't just sell clothes - they help you discover your authentic style. Their personalized approach makes all the difference.", author: "Maria R.", company: "Marketing Professional", image: "/assets/images/testimonials/brian-najuna.jpg", rating: 5 },
  { id: 5, text: "Their vintage collection is absolutely stunning. Every piece has character and quality that you just can't find in fast fashion.", fullText: "Their vintage collection is absolutely stunning. Every piece has character and quality that you just can't find in fast fashion. FusionCRAFT STUDIOS has helped me build a wardrobe that's both unique and sustainable. Their curation process ensures every item is special.", author: "Lisa T.", company: "Vintage Collector", image: "/assets/images/testimonials/lisa-t.jpg", rating: 5 },
  { id: 6, text: "The personal styling service is worth every penny. They've completely transformed my confidence and style.", fullText: "The personal styling service is worth every penny. They've completely transformed my confidence and style. The team at FusionCRAFT STUDIOS understands that fashion is about self-expression and empowerment. Their personalized approach has made all the difference in my wardrobe.", author: "Amanda S.", company: "Business Owner", image: "/assets/images/testimonials/derrick-jnr.jpg", rating: 5 },
]

export default function Testimonials() {
  const [testimonialsData, setTestimonialsData] = useState<Testimonial[]>(defaultTestimonials)
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [sliderPosition, setSliderPosition] = useState(0)
  const cardWidth = 280
  const gap = 32

  useEffect(() => {
    // Load user reviews and merge with default testimonials
    const loadReviews = () => {
      const userReviews = AuthManager.getAllReviews()
      
      // Ensure reviews have the latest profile images from users
      const users = AuthManager.getUsersList?.() || []
      const reviewsWithUpdatedImages = userReviews.map((review: any) => {
        // Find the user who wrote this review
        const reviewUser = users.find((u: any) => u.fullName === review.author)
        if (reviewUser && reviewUser.profileImage) {
          return {
            ...review,
            image: reviewUser.profileImage
          }
        }
        return review
      })
      
      const reviewsAsTestimonials: Testimonial[] = reviewsWithUpdatedImages.map((review: any) => ({
        id: review.id,
        text: review.text.length > 150 ? review.text.substring(0, 150) + '...' : review.text,
        fullText: review.text,
        author: review.author || 'Customer',
        company: 'Verified Customer',
        image: review.image || '/assets/images/testimonials/default.jpg',
        rating: review.rating || 5
      }))
      
      setTestimonialsData([...defaultTestimonials, ...reviewsAsTestimonials])
    }
    
    loadReviews()
    
    const handleReviewsUpdate = () => {
      loadReviews()
    }

    window.addEventListener('reviewsUpdated', handleReviewsUpdate)
    window.addEventListener('authStateChanged', handleReviewsUpdate) // Also update when user updates profile
    
    return () => {
      window.removeEventListener('reviewsUpdated', handleReviewsUpdate)
      window.removeEventListener('authStateChanged', handleReviewsUpdate)
    }
  }, [])

  useEffect(() => {
    if (isPaused || testimonialsData.length === 0) return
    const interval = setInterval(() => {
      setSliderPosition(prev => {
        if (Math.abs(prev) >= testimonialsData.length * (cardWidth + gap)) return 0
        return prev - 1
      })
    }, 15)
    return () => clearInterval(interval)
  }, [isPaused, testimonialsData.length])

  const handlePrev = () => {
    setSliderPosition(prev => {
      const newPosition = prev + (cardWidth + gap)
      return newPosition > 0 ? -((testimonialsData.length - 1) * (cardWidth + gap)) : newPosition
    })
  }
  const handleNext = () => {
    setSliderPosition(prev => {
      const newPosition = prev - (cardWidth + gap)
      return Math.abs(newPosition) >= testimonialsData.length * (cardWidth + gap) ? 0 : newPosition
    })
  }

  const renderStars = (rating: number) => Array.from({ length: 5 }, (_, i) => (
    <Star key={i} size={16} className={i < rating ? "text-accent-500 fill-accent-500" : "text-gray-300"} />
  ))

  const duplicatedTestimonials = [...testimonialsData, ...testimonialsData]

  return (
    <section className="testimonials section bg-gradient-to-br from-primary-100 to-primary-200 dark:from-neutral-800 dark:to-neutral-900 relative overflow-hidden" id="testimonials">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div animate={{ rotate: [0, 360], scale: [1, 1.2, 1], x: [0, 30, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute top-20 left-20 w-4 h-4 bg-primary-400/20 rounded-full" />
        <motion.div animate={{ rotate: [360, 0], scale: [1.2, 1, 1.2], y: [0, -40, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-40 right-32 w-3 h-3 bg-accent-400/20 rounded-full" />
        <motion.div animate={{ rotate: [0, -360], scale: [1, 0.8, 1], x: [0, -20, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute bottom-20 left-1/3 w-2 h-2 bg-primary-500/20 rounded-full" />
        <motion.div animate={{ rotate: [360, 0], scale: [0.8, 1.2, 0.8], y: [0, 30, 0] }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute bottom-32 right-20 w-5 h-5 bg-accent-500/20 rounded-full" />
      </div>
      <div className="container-custom">
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="text-4xl md:text-5xl font-bold text-primary-800 dark:text-primary-100 mb-16 text-center">TEᔕTIᗰOᑎIᗩᒪᔕ</motion.h2>
        <div className="slider-container relative">
          <button className="nav-button prev absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center text-primary-700 dark:text-primary-200 hover:text-primary-800 dark:hover:text-primary-100" onClick={handlePrev}>⟸</button>
          <motion.div className="slider-track flex" animate={{ x: sliderPosition }} transition={{ type: "tween", ease: "linear" }} onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} style={{ gap: `${gap}px` }}>
            {duplicatedTestimonials.map((testimonial, index) => (
              <motion.div key={`${testimonial.id}-${index}`} className="testimonial-card flex-shrink-0" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} viewport={{ once: true }} whileHover={{ scale: 1.05 }} onClick={() => setSelectedTestimonial(testimonial)} style={{ width: `${cardWidth}px` }}>
                <div className="testimonial-content bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col hover:scale-105">
                  <div className="flex justify-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary-600 dark:text-primary-300" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
                    </div>
                  </div>
                  <p className="testimonial-text text-primary-700 dark:text-primary-200 text-sm leading-relaxed mb-4 flex-grow">"{testimonial.text}"</p>
                  <div className="stars flex justify-center mb-4">{renderStars(testimonial.rating)}</div>
                  <div className="testimonial-author">
                    <div className="author-image w-12 h-12 bg-primary-200 dark:bg-primary-700 rounded-full flex items-center justify-center text-primary-800 dark:text-primary-100 font-bold text-lg mx-auto mb-2">
                      {testimonial.image ? (
                        <img src={testimonial.image} alt={testimonial.author} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        testimonial.author.split(' ').map((n: string) => n[0]).join('')
                      )}
                    </div>
                    <div className="author-info text-center">
                      <h4 className="author-name text-primary-800 dark:text-primary-100 font-semibold">{testimonial.author}</h4>
                      <p className="author-role text-primary-600 dark:text-primary-300 text-sm">{testimonial.company}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <button className="nav-button next absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center text-primary-700 dark:text-primary-200 hover:text-primary-800 dark:hover:text-primary-100" onClick={handleNext}>⟹</button>
        </div>
        <div className="mobile-nav-buttons flex justify-center mt-8 space-x-4 lg:hidden">
          <button className="mobile-nav-button w-12 h-12 bg-primary-600 dark:bg-primary-700 text-white rounded-full flex items-center justify-center hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors duration-200" onClick={handlePrev}>⟸</button>
          <button className="mobile-nav-button w-12 h-12 bg-primary-600 dark:bg-primary-700 text-white rounded-full flex items-center justify-center hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors duration-200" onClick={handleNext}>⟹</button>
        </div>
        <AnimatePresence>
          {selectedTestimonial && (
            <motion.div className="modal fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTestimonial(null)}>
              <motion.div className="modal-content bg-white dark:bg-neutral-800 rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto modal-scrollbar relative" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                <button className="close-button absolute top-4 right-4 w-8 h-8 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-full flex items-center justify-center transition-all duration-300 hover:rotate-90 hover:text-primary-600 dark:hover:text-primary-300" onClick={() => setSelectedTestimonial(null)}>
                  <X />
                </button>
                <div className="testimonial-content">
                  <p className="testimonial-text text-primary-700 dark:text-primary-200 text-lg leading-relaxed mb-6">"{selectedTestimonial.fullText}"</p>
                  <div className="stars flex justify-center mb-6">{renderStars(selectedTestimonial.rating)}</div>
                </div>
                <div className="testimonial-author">
                  <div className="author-image w-16 h-16 bg-primary-200 dark:bg-primary-700 rounded-full flex items-center justify-center text-primary-800 dark:text-primary-100 font-bold text-xl mx-auto mb-4">
                    {selectedTestimonial.image ? (
                      <img src={selectedTestimonial.image} alt={selectedTestimonial.author} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      selectedTestimonial.author.split(' ').map((n: string) => n[0]).join('')
                    )}
                  </div>
                  <div className="author-info text-center">
                    <h4 className="author-name text-primary-800 dark:text-primary-100 font-bold text-xl">{selectedTestimonial.author}</h4>
                    <p className="author-role text-primary-600 dark:text-primary-300 text-lg">{selectedTestimonial.company}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
