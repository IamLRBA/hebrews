'use client'

import { useState, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import MissionVisionCard from './MissionVisionCard'
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
  Zap
} from 'lucide-react'
import { IconBrandWhatsapp, IconBrandX } from '@tabler/icons-react'

const teamMembers = [
  {
    id: 1,
    name: "ᒍOᔕᕼᑌᗩ",
    position: "Creative Director",
    description: "A visionary creative director with over 8 years of experience in fashion curation and style direction. Joshua leads our artistic vision and ensures every piece meets the highest style standards.",
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
    id: 2,
    name: "ᑎOᗩᕼ",
    position: "Technical Lead",
    description: "A tech-savvy professional with expertise in e-commerce and digital platforms. Noah ensures our online shopping experience is seamless and our digital presence is cutting-edge.",
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
    id: 3,
    name: "ᗪIᑎGᗯᗩ",
    position: "Fashion Curator",
    description: "A passionate fashion curator with an eye for unique finds and sustainable style. Dingwa specializes in discovering thrifted treasures and curating collections that blend vintage charm with modern trends.",
    image: "/assets/images/team/dingwa.jpg",
    hoverImage: "/assets/images/team/dingwa-hover.jpg",
    social: {
      linkedin: "https://linkedin.com/in/elenapetrov",
      instagram: "https://instagram.com/elenapetrov",
      x: "https://x.com/elenapetrov",
      whatsapp: "+1234567890",
      email: "elena@fusioncraft.com"
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
          <h2 className="text-5xl md:text-5xl font-bold text-primary-800 mb-6">
          ᗩᗷOᑌT <span className="text-accent-600">Us</span>
          </h2>
          <p className="text-xl text-primary-700 max-w-3xl mx-auto">
            We discover hidden treasures in fashion aimed at unveiling unique pieces that reveal your authentic style.
          </p>
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
            <p className="text-lg text-primary-600 leading-relaxed mb-6">
              True style emerges from pieces with hidden stories. Our curated collection reveals the extraordinary 
              within the ordinary—blending vintage elegance with contemporary sophistication. Each piece is carefully 
              examined for its unique character and potential to become part of your personal narrative.
            </p>
            <div className="inline-flex items-center space-x-2 bg-primary-100 px-6 py-3 rounded-full">
              <span className="text-primary-800 font-semibold">Our Core:</span>
              <span className="text-accent-600 font-bold italic">"Hidden treasures reveal a timeless style"</span>
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
          <h3 className="text-3xl font-bold text-primary-800 mb-8">ᗰEET Oᑌᖇ ᑕEO</h3>
          
          <div className="max-w-2xl mx-auto">
            <div className="relative group">
              {/* CEO Card */}
              <div className="bg-gradient-to-br from-primary-800/20 to-primary-600/20 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border border-primary-500/20">
                <div className="w-32 h-32 mx-auto mb-6 relative overflow-hidden rounded-full border-4 border-white shadow-lg">
                  <img
                    src="/assets/images/team/lrba.jpg"
                    alt="LRBA - CEO"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <img
                    src="/assets/images/team/lrba-hover.jpg"
                    alt="LRBA - CEO"
                    className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                </div>
                
                <h4 className="text-2xl font-bold text-primary-800 mb-2">ᒪᖇᗷᗩ</h4>
                <p className="text-lg text-primary-700 mb-6">CEO & Founder</p>
                
                <Link 
                  href="/ceo-profile"
                  className="btn btn-outline inline-flex items-center space-x-2"
                >
                  <span>View Profile</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
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
          <h3 className="text-3xl font-bold text-primary-800 mb-12 text-center">Oᑌᖇ TEᗩᗰ</h3>
          
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
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <img
                      src={member.hoverImage}
                      alt={member.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    />
                  </div>
                  
                  {/* Member Info - Always Visible */}
                  <div className="text-center mb-4">
                    <h4 className="text-xl font-bold text-primary-800 mb-2">{member.name}</h4>
                    <p className="text-primary-600 font-medium">{member.position}</p>
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
                    <p className="text-primary-600 text-sm leading-relaxed mb-4">
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
                      <a
                        href={member.social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 hover:bg-primary-200 transition-colors duration-200"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                      <a
                        href={member.social.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 hover:bg-primary-200 transition-colors duration-200"
                      >
                        <Instagram className="w-4 h-4" />
                      </a>
                      <a
                        href={member.social.x}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 hover:bg-primary-200 transition-colors duration-200"
                      >
                        <IconBrandX className="w-4 h-4" />
                      </a>
                      <a
                        href={`https://wa.me/${member.social.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 hover:bg-primary-200 transition-colors duration-200"
                      >
                        <IconBrandWhatsapp className="w-4 h-4" />
                      </a>
                      <a
                        href={`mailto:${member.social.email}`}
                        className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 hover:bg-primary-200 transition-colors duration-200"
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
          <h3 className="text-3xl font-bold text-primary-800 mb-12 text-center">Oᑌᖇ ᐯᗩᒪᑌEᔕ</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 px-8 md:px-12 lg:px-16">
            {[
              {
                image: "/assets/images/sections/home/values-1.jpg",
                title: "Sustainability",
                description: "We champion circular fashion through thoughtful curation. Every piece we discover extends its narrative while reducing waste and preserving stories embedded in quality garments."
              },
              {
                image: "/assets/images/sections/home/values-2.jpg",
                title: "Excellence",
                description: "Uncompromising standards guide our curation. Each piece undergoes meticulous examination for condition, craftsmanship, and timeless appeal."
              },
              {
                image: "/assets/images/sections/home/values-3.jpg",
                title: "Authenticity",
                description: "We celebrate unique stories each piece carries. Our collection reveals garments that speak to individual expression, helping you discover pieces that resonate with your authentic self."
              },
              {
                image: "/assets/images/sections/home/values-4.jpg",
                title: "Collaboration",
                description: "Your style journey is our partnership. We provide expert guidance and dedicated support as you discover pieces that reveal your unique aesthetic."
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
                  <img 
                    src={value.image} 
                    alt={value.title} 
                    className="w-24 h-24 object-cover rounded-xl mx-auto"
                  />
                </div>
                <div className={`${index % 2 === 0 ? 'text-left' : 'text-right'}`}>
                  <div className={`text-6xl font-bold text-primary-400 mb-4 ${index % 2 === 0 ? 'text-left' : 'text-right'}`}>
                    0{index + 1}
                  </div>
                  <h4 className="text-2xl font-bold text-primary-800 mb-4">{value.title}</h4>
                  <p className="text-primary-600 text-base leading-relaxed">
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
          <h3 className="text-3xl font-bold text-primary-800 mb-12 text-center">Oᑌᖇ ᗰIᔕᔕIOᑎᔕ</h3>
          
          <div className="space-y-16 flex flex-col items-center max-w-4xl mx-auto">
            {[
              {
                image: "/assets/images/sections/home/missions-1.jpg",
                title: "Discovery",
                description: "We uncover exceptional pieces others overlook. Our curation process examines each garment for hidden potential—quality construction, timeless design, and unique character."
              },
              {
                image: "/assets/images/sections/home/missions-2.jpg",
                title: "Recycling",
                description: "We transform pre-loved pieces into future favorites while supporting responsible new apparel. Every curated piece contributes to a more sustainable fashion ecosystem."
              },
              {
                image: "/assets/images/sections/home/missions-3.jpg",
                title: "Revelation",
                description: "We help individuals discover their authentic aesthetic through thoughtfully curated selections. Our pieces serve as tools to reveal and refine your unique style narrative."
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
                    <img 
                      src={mission.image} 
                      alt={mission.title} 
                      className="w-24 h-24 object-cover rounded-xl"
                    />
                  </div>
                  
                  {/* Content */}
                  <div className={`flex flex-col flex-1 ${
                    index % 2 === 0 
                      ? 'text-left'
                      : 'text-right'
                  }`}>
                    <div className={`text-6xl font-bold text-primary-400 mb-4 ${
                      index % 2 === 0 ? '' : 'text-right'
                    }`}>0{index + 1}</div>
                    <h4 className="text-3xl font-bold text-primary-800 mb-2">{mission.title}</h4>
                    <p className={`text-primary-600 text-lg ${
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
          <h3 className="text-3xl font-bold text-primary-800 mb-12 text-center">ᗰIᔕᔕIOᑎ & ᐯIᔕIOᑎ</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[
              { 
                image: "/assets/images/sections/mission/mission-icon.jpg", 
                title: "Mission Statement", 
                description: "To curate exceptional fashion pieces that reveal timeless style through sustainable practices. We unite carefully selected thrifted treasures with responsibly made new apparel, delivering quality, value, and authentic self-expression." 
              },
              { 
                image: "/assets/images/sections/mission/vision-icon.jpg", 
                title: "Vision Statement", 
                description: "To create a circular fashion ecosystem where conscious choices become effortless, hidden treasures are revealed, and timeless pieces transcend fleeting trends." 
              }
            ].map((item, index) => (
              <MissionVisionCard key={index} item={item} index={index} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
