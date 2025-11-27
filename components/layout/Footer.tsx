'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { SOCIAL_LINKS } from '@/lib/constants/social'
import MysticalPiecesWord from '@/components/ui/MysticalPiecesWord'
import LogoMark from '@/components/ui/LogoMark'

export default function Footer() {
  return (
    <footer className="footer relative bg-gradient-to-b from-primary-100 to-primary-200 text-neutral-850 dark:text-white overflow-hidden border-t border-primary-700/30 dark:border-neutral-700">
      <div className="footer-wave"></div>
      <div className="footer-content container-custom relative z-10">
        <div className="social-links">
          {SOCIAL_LINKS.map((social) => {
            const Icon = social.icon as any
            return (
              <motion.a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" className="social-link" whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                <Icon size={24} />
              </motion.a>
            )
          })}
        </div>
        <div className="footer-divider"></div>
        <div className="copyright-section">
          <Link href="/" className="footer-logo group">
            <LogoMark size={140} className="transition-transform duration-300 group-hover:scale-110" />
          </Link>
          <Link href="/" className="tagline brand-name leading-tight inline-block hover:opacity-90 transition-opacity">
            <MysticalPiecesWord /> 
          </Link>
          <p className="tagline text-1xl md:text-2xl font-light">
            Style that transcends the ordinary.
          </p>
          <p className="copyright">
            © {new Date().getFullYear()} <MysticalPiecesWord /> . All rights reserved.
          </p>
          <p className="copyright2">Designed by <a href="https://github.com/IamLRBA" target="_blank" rel="noopener noreferrer">ᒪᖇᗷᗩ</a></p>
          <div className="legal-links">
            <Link href="/privacy-policy" className="legal-link">Privacy Policy</Link>
            <span className="separator">•</span>
            <Link href="/terms-conditions" className="legal-link">Terms & Conditions</Link>
          </div>
        </div>
      </div>
      <style jsx>{`
        .footer { position: relative; }
      `}</style>
      <style jsx global>{`
        .dark .footer { 
          background: linear-gradient(to bottom, #191919, #252525) !important;
        }
        .footer-wave { position: absolute; top: -10px; left: 0; width: 100%; height: 20px; background: linear-gradient(135deg, transparent 0%, transparent 30%, var(--color-primary-300) 30%, var(--color-primary-300) 35%, transparent 35%, transparent 65%, var(--color-primary-300) 65%, var(--color-primary-300) 70%, transparent 70%, transparent 100%); background-size: 40px 20px; }
        .footer-content { padding: 3rem 0 2rem; text-align: center; }
        .social-links { display: flex; justify-content: center; align-items: center; gap: 1.5rem; margin-bottom: 2rem; }
        .social-link { display: flex; align-items: center; justify-content: center; width: 3rem; height: 3rem; background: rgba(38, 36, 36, 0.1); border-radius: 50%; color: var(--color-primary-600); transition: all 0.3s ease; backdrop-filter: blur(10px); border: 1px solid rgba(38, 36, 36, 0.2); }
        .social-link:hover { background: rgba(38, 36, 36, 0.2); border-color: rgba(38, 36, 36, 0.4); color: var(--color-primary-700); transform: translateY(-2px); }
        .dark .social-link { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: var(--color-primary-300); }
        .dark .social-link:hover { background: rgba(255, 255, 255, 0.2); border-color: rgba(255, 255, 255, 0.4); color: white; }
        .footer-divider { width: 100%; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(38, 36, 36, 0.3) 50%, transparent 100%); margin: 2rem 0; }
        .dark .footer-divider { background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%); }
        .copyright-section { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .footer-logo { margin-bottom: 0.5rem; display: flex; justify-content: center; }
        .tagline { color: var(--color-primary-700); margin: 0; font-weight: var(--font-weight-light); letter-spacing: 0.02em; }
        .tagline.brand-name { font-size: 2.3rem !important; }
        @media (min-width: 768px) {
          .tagline.brand-name { font-size: 3.3rem !important; }
        }
        @media (min-width: 1024px) {
          .tagline.brand-name { font-size: 4.3rem !important; }
        }
        .dark .tagline { color: var(--color-primary-300); }
        .copyright { font-size: 0.875rem; color: var(--color-primary-700); margin: 0; }
        .dark .copyright { color: var(--color-primary-300); }
        .copyright2 { font-size: 0.75rem; color: rgba(38, 36, 36, 0.7); margin: 0; }
        .dark .copyright2 { color: rgba(255, 255, 255, 0.6); }
        .copyright2 a { color: var(--color-primary-600); text-decoration: none; transition: all 0.3s ease; display: inline-flex; align-items: center; justify-content: center; width: 3rem; height: 3rem; border-radius: 50%; border: 1px solid rgba(38, 36, 36, 0.2); background: rgba(38, 36, 36, 0.1); }
        .copyright2 a:hover { background: rgba(38, 36, 36, 0.2); border-color: rgba(38, 36, 36, 0.4); color: var(--color-primary-700); transform: translateY(-2px); }
        .dark .copyright2 a { color: var(--color-primary-300); border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.1); }
        .dark .copyright2 a:hover { background: rgba(255, 255, 255, 0.2); border-color: rgba(255, 255, 255, 0.4); color: white; }
        .legal-links { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
        .legal-link { color: rgba(38, 36, 36, 0.7); text-decoration: none; font-size: 0.75rem; transition: color 0.3s ease; }
        .legal-link:hover { color: var(--color-primary-700); }
        .dark .legal-link { color: rgba(255, 255, 255, 0.6); }
        .dark .legal-link:hover { color: white; }
        .separator { color: rgba(38, 36, 36, 0.5); font-size: 0.75rem; }
        .dark .separator { color: rgba(255, 255, 255, 0.4); }
        @media (max-width: 640px) { .social-links { gap: 1rem; } .social-link { width: 2.5rem; height: 2.5rem; } .social-link svg { width: 20px; height: 20px; } }
      `}</style>
    </footer>
  )
}


