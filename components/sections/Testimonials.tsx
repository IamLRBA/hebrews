'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star } from 'lucide-react'
import { AuthManager } from '@/lib/auth'
import { renderWithMysticalPieces } from '@/components/ui/MysticalPiecesWord'

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
  { id: 1, text: "MysticalPIECES has an incredible eye for unique fashion finds. Their thrifted pieces are always in perfect condition and their styling advice is spot-on.", fullText: "MysticalPIECES has an incredible eye for unique fashion finds. Their thrifted pieces are always in perfect condition and their styling advice is spot-on. I've built most of my wardrobe from their curated collection, and every piece tells a story. The quality and uniqueness of their items is unmatched.", author: "Brian Najuna", company: "Fashion Enthusiast", image: "/assets/images/testimonials/brian-najuna.jpg", rating: 5 },
  { id: 2, text: "Their sustainable fashion approach is refreshing. They've helped me discover my personal style while being environmentally conscious.", fullText: "Their sustainable fashion approach is refreshing. They've helped me discover my personal style while being environmentally conscious. The team understands that fashion should be both beautiful and responsible. Every piece I've purchased has been a perfect fit for my lifestyle and values.", author: "Derrick Jnr", company: "Style Consultant", image: "/assets/images/testimonials/derrick-jnr.jpg", rating: 5 },
  { id: 3, text: "The blend of vintage and contemporary pieces they offer is exactly what I was looking for. Their curation is impeccable.", fullText: "The blend of vintage and contemporary pieces they offer is exactly what I was looking for. Their curation is impeccable. MysticalPIECES has helped me create a wardrobe that's both timeless and trendy. Their attention to detail and quality is evident in every piece they select.", author: "Irene Lekuru Gasper", company: "Fashion Blogger", image: "/assets/images/testimonials/irene-lekuru-gasper.jpg", rating: 5 },
  { id: 4, text: "Their styling consultations have transformed how I approach fashion. I now feel confident in every outfit I wear.", fullText: "Their styling consultations have transformed how I approach fashion. I now feel confident in every outfit I wear. The team at MysticalPIECES doesn't just sell clothes - they help you discover your authentic style. Their personalized approach makes all the difference.", author: "Sekina Paws", company: "Marketing Professional", image: "/assets/images/testimonials/sekina-paws.jpg", rating: 5 },
  { id: 5, text: "Their vintage collection is absolutely stunning. Every piece has character and quality that you just can't find in fast fashion.", fullText: "Their vintage collection is absolutely stunning. Every piece has character and quality that you just can't find in fast fashion. MysticalPIECES has helped me build a wardrobe that's both unique and sustainable. Their curation process ensures every item is special.", author: "Sizi", company: "Vintage Collector", image: "/assets/images/testimonials/sizi.jpg", rating: 5 },
  { id: 6, text: "The personal styling service is worth every penny. They've completely transformed my confidence and style.", fullText: "The personal styling service is worth every penny. They've completely transformed my confidence and style. The team at MysticalPIECES understands that fashion is about self-expression and empowerment. Their personalized approach has made all the difference in my wardrobe.", author: "Yusuf Wasswa", company: "Business Owner", image: "/assets/images/testimonials/yusuf-wasswa.jpg", rating: 5 },
]

export default function Testimonials() {
  const [testimonialsData, setTestimonialsData] = useState<Testimonial[]>(defaultTestimonials)
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [sliderPosition, setSliderPosition] = useState(0)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const cardWidth = 280
  const gap = 32

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    checkDarkMode()
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

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
    <Star key={i} size={12} className={i < rating ? "text-accent-500 fill-accent-500" : "text-gray-300"} />
  ))

  const duplicatedTestimonials = [...testimonialsData, ...testimonialsData]

  return (
    <section className="section relative overflow-hidden">
      <div className="container-custom relative z-10">
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="text-4xl md:text-5xl font-bold text-primary-800 dark:text-primary-100 mb-16 text-center">TEᔕTIᗰOᑎIᗩᒪᔕ</motion.h2>
        <div className="slider-container relative">
          <motion.div className="slider-track flex" animate={{ x: sliderPosition }} transition={{ type: "tween", ease: "linear" }} onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} style={{ gap: `${gap}px` }}>
            {duplicatedTestimonials.map((testimonial, index) => (
              <motion.div key={`${testimonial.id}-${index}`} className="testimonial-card flex-shrink-0" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} viewport={{ once: true }} whileHover={{ scale: 1.05 }} onClick={() => setSelectedTestimonial(testimonial)} style={{ width: `${cardWidth}px` }}>
                <div className="testimonial-content bg-gradient-to-br from-primary-800/30 to-primary-600/30 dark:from-primary-800/40 dark:to-primary-600/40 rounded-2xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col hover:scale-105 border border-primary-500/30 dark:border-primary-500/40 backdrop-blur-sm">
                  <div className="flex justify-center mb-1.5">
                    <div className="w-6 h-6 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary-600 dark:text-primary-300" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
                    </div>
                  </div>
                  <p className="testimonial-text text-primary-700 dark:text-primary-200 text-xs leading-snug mb-2 flex-grow line-clamp-4">
                    &ldquo;{renderWithMysticalPieces(testimonial.text, `card-${testimonial.id}-${index}`)}&rdquo;
                  </p>
                  <div className="stars flex justify-center mb-2">{renderStars(testimonial.rating)}</div>
                  <div className="testimonial-author">
                    <div className="author-image w-8 h-8 bg-primary-200 dark:bg-primary-700 rounded-full flex items-center justify-center text-primary-800 dark:text-primary-100 font-bold text-sm mx-auto mb-1 overflow-hidden">
                      {testimonial.image ? (
                        <img src={testimonial.image} alt={testimonial.author} className="w-full h-full rounded-full object-cover grayscale" />
                      ) : (
                        testimonial.author.split(' ').map((n: string) => n[0]).join('')
                      )}
                    </div>
                    <div className="author-info text-center">
                      <h4 className="author-name text-primary-800 dark:text-primary-100 font-semibold text-xs">{testimonial.author}</h4>
                      <p className="author-role text-primary-600 dark:text-primary-300 text-xs">{testimonial.company}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
        <div className="mobile-nav-buttons flex justify-center mt-8 space-x-4">
          <button
            className="nav-button w-12 h-12 btn btn-circle btn-hover-secondary-filled shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group backdrop-blur-sm text-primary-700 dark:text-primary-200 hover:text-primary-800 dark:hover:text-primary-100"
            onClick={handlePrev}
          >
            ⟸
          </button>
          <button
            className="nav-button w-12 h-12 btn btn-circle btn-hover-secondary-filled shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group backdrop-blur-sm text-primary-700 dark:text-primary-200 hover:text-primary-800 dark:hover:text-primary-100"
            onClick={handleNext}
          >
            ⟹
          </button>
        </div>
        <AnimatePresence>
          {selectedTestimonial && (
            <motion.div 
              className="modal fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
              style={{
                backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.5)'
              }}
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedTestimonial(null)}
            >
              <motion.div className="modal-content bg-white dark:bg-[#191919] rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto modal-scrollbar relative" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                <button className="close-button absolute top-4 right-4 w-8 h-8 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-full flex items-center justify-center transition-all duration-300 hover:rotate-90 hover:text-primary-600 dark:hover:text-primary-300" onClick={() => setSelectedTestimonial(null)}>
                  <X />
                </button>
                <div className="testimonial-content">
                  <p className="testimonial-text text-primary-700 dark:text-primary-200 text-base leading-relaxed mb-4">
                    &ldquo;{renderWithMysticalPieces(selectedTestimonial.fullText, `modal-${selectedTestimonial.id}`)}&rdquo;
                  </p>
                  <div className="stars flex justify-center mb-4">{renderStars(selectedTestimonial.rating)}</div>
                </div>
                <div className="testimonial-author">
                  <div className="author-image w-12 h-12 bg-primary-200 dark:bg-primary-700 rounded-full flex items-center justify-center text-primary-800 dark:text-primary-100 font-bold text-base mx-auto mb-2 overflow-hidden">
                    {selectedTestimonial.image ? (
                      <img src={selectedTestimonial.image} alt={selectedTestimonial.author} className="w-full h-full rounded-full object-cover grayscale" />
                    ) : (
                      selectedTestimonial.author.split(' ').map((n: string) => n[0]).join('')
                    )}
                  </div>
                  <div className="author-info text-center">
                    <h4 className="author-name text-primary-800 dark:text-primary-100 font-semibold text-base mb-0.5">{selectedTestimonial.author}</h4>
                    <p className="author-role text-primary-600 dark:text-primary-300 text-sm">{selectedTestimonial.company}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style jsx>{`
        :global(.dark .modal-content) {
          background-color: #191919 !important;
        }
        :global(.dark .modal) {
          background-color: rgba(0, 0, 0, 0.3) !important;
          backdrop-filter: blur(4px);
        }
      `}</style>
    </section>
  )
}
