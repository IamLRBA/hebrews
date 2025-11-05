'use client'

import AboutUs from '@/components/sections/AboutUs'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function AboutUsPage() {
  return (
    <>
      <AboutUs />
      
      {/* CTA Section */}
      <section className="section bg-gradient-to-br from-primary-100 via-primary-200 to-primary-300 py-20">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-primary-800 mb-6">
              E᙭ᑭᒪOᖇE <span className="text-accent-600">the Portals</span>
            </h2>
            <p className="text-xl text-primary-700 max-w-3xl mx-auto mb-8">
              Discover the art of fashion and style through our curated portal
            </p>
            <Link
              href="/sections/fashion"
              className="btn btn-primary text-lg px-8 py-4 inline-flex items-center space-x-2 group"
            >
              <span>VᎥᎬᏔ ᎢᎻᎬ FᗩᔕᕼIOᑎ ᑭOᖇTᗩᒪ</span>
              <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  )
}

