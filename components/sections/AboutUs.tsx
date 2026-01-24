'use client'

import { useState, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import MissionVisionCard from './MissionVisionCard'
import MysticalPiecesWord from '@/components/ui/MysticalPiecesWord'
import AnimatedImageBannerAboutUs from './AnimatedImageBannerAboutUs'
import Contact from './Contact'
import { 
  Building2, 
  Music, 
  Palette, 
  Code, 
  Shirt,
  Linkedin,
  Instagram,
  Mail,
  ExternalLink,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { IconBrandWhatsapp, IconBrandX, IconBrandTiktok } from '@tabler/icons-react'
import { AnimatePresence } from 'framer-motion'

// CEO Profile Dropdown Component
function CEOProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)

  const socialLinks = [
    { name: 'LinkedIn', href: 'https://www.linkedin.com/in/ndacyayisenga-droid/', icon: Linkedin },
    { name: 'Instagram', href: 'https://www.instagram.com/p/DCKOuHEChyu/?igsh=MW5uemhmaW15dTRtag==', icon: Instagram },
    { name: 'X (Twitter)', href: 'https://twitter.com/NdacyayisengaN1', icon: IconBrandX },
    { name: 'WhatsApp', href: 'https://wa.me/256750571027', icon: IconBrandWhatsapp },
    { name: 'Email', href: 'mailto:ndacyayinoah@gmail.com', icon: Mail },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-outline inline-flex items-center space-x-2 w-full justify-center"
      >
        <span>{isOpen ? 'Minimise Profile' : 'Read Profile'}</span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 overflow-hidden"
          >
            <div className="bg-primary-800/10 dark:bg-primary-900/20 backdrop-blur-sm rounded-xl p-6 border border-primary-500/20 space-y-6">
              <div>
                <p className="text-primary-700 dark:text-primary-300 text-sm leading-relaxed mb-4">
                  A visionary leader and entrepreneur who founded Cafe Hebrews with a mission to create a luxury destination where culinary excellence meets refined hospitality. With a passion for creating exceptional dining experiences, LRBA has built a brand that celebrates tradition while embracing innovation in the culinary arts.
                </p>
              </div>

              <div>
                <h5 className="text-lg font-bold text-primary-800 dark:text-primary-100 mb-3">ᑕOᑎᑎEᑕT</h5>
                <div className="flex flex-wrap justify-center gap-3">
                  {socialLinks.map((social, index) => {
                    const Icon = social.icon
                    return (
                      <a
                        key={index}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-700 transition-colors duration-200"
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const teamMembers = [
  {
    id: 1,
    name: "Admin",
    position: "Administrator",
    description: "All access privileges including menu engineering and staff management. Ensures smooth operations and maintains the highest standards of service excellence.",
    image: "/assets/images/team/noah-tayebwa.png",
    hoverImage: "/assets/images/team/noah-tayebwa-hover.jpg",
    social: {
      linkedin: "https://www.linkedin.com/in/ndacyayisenga-droid/",
      instagram: "https://www.instagram.com/p/DCKOuHEChyu/?igsh=MW5uemhmaW15dTRtag==",
      x: "https://twitter.com/NdacyayisengaN1",
      whatsapp: "https://wa.me/256750571027",
      email: "mailto:ndacyayinoah@gmail.com"
    }
  },
  {
    id: 2,
    name: "General Manager",
    position: "General Manager",
    description: "All access privileges including menu engineering and staff management. Oversees daily operations, ensures quality control, and maintains service standards across all channels.",
    image: "/assets/images/team/dingwa.jpg",
    hoverImage: "/assets/images/team/dingwa-hover.jpg",
    social: {
      tiktok: "https://www.tiktok.com/@iamlrba?_t=ZM-8yRqigzltXK&_r=1",
      instagram: "https://instagram.com/elenapetrov",
      x: "https://x.com/elenapetrov",
      whatsapp: "+1234567890",
      email: "elena@fusioncraft.com"
    }
  },
  {
    id: 3,
    name: "Supervisor",
    position: "Supervisor",
    description: "Manages discounts (over 10%), handles void approvals, and ensures smooth service operations. Maintains quality standards and customer satisfaction.",
    image: "/assets/images/team/dingwa.jpg",
    hoverImage: "/assets/images/team/dingwa-hover.jpg",
    social: {
      linkedin: "https://linkedin.com/in/sarahchen",
      instagram: "https://instagram.com/sarahchen",
      x: "https://x.com/sarahchen",
      whatsapp: "+1234567890",
      email: "sarah@fusioncraft.com"
    }
  },
  {
    id: 4,
    name: "Head Chef/Barista",
    position: "Head Chef & Barista",
    description: "Responsible for stock counting and recipe viewing. Ensures culinary excellence and maintains the highest standards in food and beverage preparation.",
    image: "/assets/images/team/joshua-nsereko.jpg",
    hoverImage: "/assets/images/team/joshua-nsereko-hover.jpg",
    social: {
      linkedin: "https://linkedin.com/in/sarahchen",
      instagram: "https://instagram.com/sarahchen",
      x: "https://x.com/sarahchen",
      whatsapp: "+1234567890",
      email: "sarah@fusioncraft.com"
    }
  },
  {
    id: 5,
    name: "Waiter/Cashier",
    position: "Waiter & Cashier",
    description: "Handles order entry, bill printing, and payment recording. Ensures efficient service delivery and accurate transaction processing for all customers.",
    image: "/assets/images/team/noah-tayebwa.png",
    hoverImage: "/assets/images/team/noah-tayebwa-hover.jpg",
    social: {
      linkedin: "https://www.linkedin.com/in/ndacyayisenga-droid/",
      instagram: "https://www.instagram.com/p/DCKOuHEChyu/?igsh=MW5uemhmaW15dTRtag==",
      x: "https://twitter.com/NdacyayisengaN1",
      whatsapp: "https://wa.me/256750571027",
      email: "mailto:ndacyayinoah@gmail.com"
    }
  }
]

export default function AboutUs() {
  const [hoveredMember, setHoveredMember] = useState<number | null>(null)
  const containerRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  const titleY = useTransform(scrollYProgress, [0, 1], [0, -50])
  const titleScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.1, 1])

  return (
    <section ref={containerRef} className="section bg-unified">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="section-title"
          style={{ y: titleY, scale: titleScale }}
        >
          <h2 className="text-5xl md:text-5xl font-bold text-primary-800 dark:text-primary-100 mb-6">
          ᗩᗷOᑌT <span className="text-accent-600 dark:text-accent-100">Us</span>
          </h2>
          <p className="text-xl text-primary-700 dark:text-primary-300 max-w-3xl mx-auto">
            We discover culinary excellence aimed at unveiling unique flavors that reveal your authentic taste for luxury.
          </p>
        </motion.div>

        {/* Animated Image Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative w-full py-8 md:py-12 overflow-hidden mb-16"
        >
          <div className="container-custom relative z-10">
            <AnimatedImageBannerAboutUs />
          </div>
        </motion.div>

        {/* Company Description */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-16"
        >
          <div className="max-w-4xl mx-auto">
            <p className="text-lg text-primary-600 dark:text-primary-300 leading-relaxed mb-6">
              <MysticalPiecesWord />  began with a vision to connect culinary artistry and luxury dining as a reflection of sophistication. We source from the finest markets and artisanal producers to uncover flavors with story, quality, and culinary integrity.
            </p>
            <p className="text-lg text-primary-600 dark:text-primary-300 leading-relaxed mb-6">
              We blend tradition with modern innovation, bridging classic techniques and contemporary gastronomy. We are an invitation to dine with elegance, refinement, and purpose.
            </p>
            <div className="inline-flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 bg-primary-100 dark:bg-primary-900/30 px-4 sm:px-6 py-3 rounded-full">
              <span className="text-primary-800 dark:text-primary-100 font-semibold text-sm sm:text-base">Our Core:</span>
              <span
                className="text-accent-600 dark:text-accent-400 font-bold text-lg sm:text-xl md:text-3xl leading-snug text-center sm:text-left"
                style={{ fontFamily: '"Mrs Saint Delafield", cursive' }}
              >
                Dining excellence reveals timeless luxury
              </span>
            </div>
          </div>
        </motion.div>

        {/* CEO Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mb-20"
        >
          <h3 className="text-3xl font-bold text-primary-800 dark:text-primary-100 mb-8">ᗰEET Oᑌᖇ ᑕEO</h3>
          
          <div className="max-w-2xl mx-auto">
            <div className="relative group">
              {/* CEO Card */}
              <div className="bg-gradient-to-br from-primary-800/20 to-primary-600/20 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border border-primary-500/20">
                <div className="w-32 h-32 mx-auto mb-6 relative overflow-hidden rounded-full border-4 border-white shadow-lg">
                  <Image
                    src="/assets/images/team/lrba.jpg"
                    alt="LRBA - CEO and Founder of Cafe Hebrews"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="eager"
                    priority
                  />
                  <Image
                    src="/assets/images/team/lrba-hover.jpg"
                    alt="LRBA - CEO"
                    width={128}
                    height={128}
                    className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                </div>
                
                <h4 className="text-2xl font-bold text-primary-800 dark:text-primary-100 mb-2">ᒪᖇᗷᗩ</h4>
                <p className="text-lg text-primary-700 dark:text-primary-300 mb-6">CEO & Founder</p>
                
                <CEOProfileDropdown />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Team Members */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <h3 className="text-3xl font-bold text-primary-800 dark:text-primary-100 mb-12 text-center">Oᑌᖇ TEᗩᗰ</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 * index }}
                className="group"
                onMouseEnter={() => setHoveredMember(member.id)}
                onMouseLeave={() => setHoveredMember(null)}
              >
                <div className="bg-primary-800/10 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border border-primary-500/20 relative overflow-hidden">
                  {/* Member Image */}
                  <div className="w-32 h-32 mx-auto mb-6 relative overflow-hidden rounded-full border-4 border-primary-200">
                    <Image
                      src={member.image}
                      alt={`${member.name} - ${member.position}`}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <Image
                      src={member.hoverImage}
                      alt={`${member.name} - ${member.position}`}
                      width={128}
                      height={128}
                      className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    />
                  </div>
                  
                  {/* Member Info - Always Visible */}
                  <div className="text-center mb-4">
                    <h4 className="text-xl font-bold text-primary-800 dark:text-primary-100 mb-2">{member.name}</h4>
                    <p className="text-primary-600 dark:text-primary-300 font-medium">{member.position}</p>
                  </div>
                  
                  {/* Description - Hidden by default, shown on hover */}
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ 
                      opacity: hoveredMember === member.id ? 1 : 0,
                      height: hoveredMember === member.id ? 'auto' : 0
                    }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="text-primary-600 dark:text-primary-300 text-sm leading-relaxed mb-4">
                      {member.description}
                    </p>
                  </motion.div>
                  
                  {/* Social Links - Hidden by default, shown on hover */}
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ 
                      opacity: hoveredMember === member.id ? 1 : 0,
                      height: hoveredMember === member.id ? 'auto' : 0
                    }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="overflow-hidden"
                  >
                    <div className="flex justify-center space-x-3 pt-4 border-t border-primary-100">
                      {member.social.tiktok ? (
                        <a
                          href={member.social.tiktok}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-700 transition-colors duration-200"
                        >
                          <IconBrandTiktok className="w-4 h-4" />
                        </a>
                      ) : (
                        <a
                          href={member.social.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-700 transition-colors duration-200"
                        >
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                      <a
                        href={member.social.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-700 transition-colors duration-200"
                      >
                        <Instagram className="w-4 h-4" />
                      </a>
                      <a
                        href={member.social.x}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-700 transition-colors duration-200"
                      >
                        <IconBrandX className="w-4 h-4" />
                      </a>
                      <a
                        href={`https://wa.me/${member.social.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-700 transition-colors duration-200"
                      >
                        <IconBrandWhatsapp className="w-4 h-4" />
                      </a>
                      <a
                        href={`mailto:${member.social.email}`}
                        className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-700 transition-colors duration-200"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    </div>
                  </motion.div>
                  
                  {/* Hover Indicator */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-2 h-2 bg-accent-400 rounded-full"></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Values Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-20"
        >
          <h3 className="text-3xl font-bold text-primary-800 dark:text-primary-100 mb-12 text-center">Our Values</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 px-8 md:px-12 lg:px-16">
            {[
              {
                image: "/assets/images/sections/home/values-1.jpg",
                title: "Intuition",
                description: "We follow subtle culinary cues to create dishes that resonate now and stay timeless in the future."
              },
              {
                image: "/assets/images/sections/home/values-4.jpg",
                title: "Connection",
                description: "Each dining experience connects traditional and modern flavors, nurturing a conscious culinary community."
              },
              {
                image: "/assets/images/sections/home/values-3.jpg",
                title: "Sustainability",
                description: "We honor Earth by sourcing quality ingredients responsibly and reducing culinary waste."
              },
              {
                image: "/assets/images/sections/home/values-2.jpg",
                title: "Expression",
                description: "We champion refined culinary artistry, letting elegant presentation deliver bold flavors."
              }
            ].map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 * index }}
                className={`group ${index % 2 === 0 ? 'text-left' : 'text-right'}`}
              >
                <div className={`flex-shrink-0 w-40 h-40 bg-gradient-to-br from-primary-800/30 to-primary-600/30 rounded-2xl border border-primary-500/30 overflow-hidden shadow-2xl p-8 mb-6 group-hover:scale-110 transition-transform duration-300 ${index % 2 === 0 ? 'ml-0 mr-auto' : 'mr-0 ml-auto'}`}>
                  <Image 
                    src={value.image} 
                    alt={`${value.title} value icon`}
                    width={96}
                    height={96}
                    className="w-24 h-24 object-cover rounded-xl mx-auto"
                    loading="lazy"
                  />
                </div>
                <div className={`${index % 2 === 0 ? 'text-left' : 'text-right'}`}>
                  <div className={`text-6xl font-bold text-primary-400 dark:text-primary-300 mb-4 ${index % 2 === 0 ? 'text-left' : 'text-right'}`}>
                    0{index + 1}
                  </div>
                  <h4 className="text-2xl font-bold text-primary-800 dark:text-primary-100 mb-4">{value.title}</h4>
                  <p className="text-primary-600 dark:text-primary-300 text-base leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Missions Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="mt-20"
        >
          <h3 className="text-3xl font-bold text-primary-800 dark:text-primary-100 mb-12 text-center">Our Missions</h3>
          
          <div className="space-y-16 flex flex-col items-center max-w-4xl mx-auto">
            {[
              {
                image: "/assets/images/sections/home/missions-1.jpg",
                title: "Premium Sourcing",
                description: "To source exceptional ingredients with enduring quality, striking flavors, and forward-thinking culinary innovation."
              },
              {
                image: "/assets/images/sections/home/missions-2.jpg",
                title: "Sustainable Dining",
                description: "To create memorable dining experiences with care, making sustainable luxury effortless and elegant."
              },
              {
                image: "/assets/images/sections/home/missions-3.jpg",
                title: "Culinary Signature",
                description: "To help you discover a personal dining style that feels intuitive, refined, and unmistakably sophisticated."
              }
            ].map((mission, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 * index }}
                className="w-full"
              >
                <div className={`flex flex-col items-center space-y-8 ${
                  index % 2 === 0 
                    ? 'flex-row space-x-12 md:flex-row md:space-x-12'
                    : 'flex-row-reverse space-x-reverse space-x-12 md:flex-row-reverse md:space-x-reverse md:space-x-12'
                }`}>
                  {/* Image Container */}
                  <div className="flex-shrink-0 bg-gradient-to-br from-primary-800/30 to-primary-600/30 rounded-2xl border border-primary-500/30 overflow-hidden shadow-2xl p-8">
                    <Image 
                      src={mission.image} 
                      alt={`${mission.title} mission icon`}
                      width={96}
                      height={96}
                      className="w-24 h-24 object-cover rounded-xl"
                      loading="lazy"
                    />
                  </div>
                  
                  {/* Content */}
                  <div className={`flex flex-col flex-1 ${
                    index % 2 === 0 
                      ? 'text-left'
                      : 'text-right'
                  }`}>
                    <div className={`text-6xl font-bold text-primary-400 dark:text-primary-300 mb-4 ${
                      index % 2 === 0 ? '' : 'text-right'
                    }`}>0{index + 1}</div>
                    <h4 className="text-3xl font-bold text-primary-800 dark:text-primary-100 mb-2">{mission.title}</h4>
                    <p className={`text-primary-600 dark:text-primary-300 text-lg ${
                      index % 2 === 0 
                        ? 'max-w-md'
                        : 'max-w-md ml-auto'
                    }`}>
                      {mission.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Mission & Vision Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mt-20"
        >
          <h3 className="text-3xl font-bold text-primary-800 dark:text-primary-100 mb-12 text-center">Mission & Vision</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[
              { 
                image: "/assets/images/sections/mission/mission-icon.jpg", 
                title: "Mission Statement", 
                description: (
                  <>
                    <MysticalPiecesWord />  exists to awaken culinary passion and inspire mindful connection through luxury and amazing dining experiences.
                  </>
                ) 
              },
              { 
                image: "/assets/images/sections/mission/vision-icon.jpg", 
                title: "Vision Statement", 
                description: "We envision a world where luxury dining speaks in intuitive, refined tones uniting culinary artistry, sustainability, and human-centered hospitality." 
              }
            ].map((item, index) => (
              <MissionVisionCard key={index} item={item} index={index} />
            ))}
          </div>
        </motion.div>

        {/* Contact Section - GET IN TOUCH */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="mt-20"
        >
          <Contact />
        </motion.div>
      </div>
    </section>
  )
}
