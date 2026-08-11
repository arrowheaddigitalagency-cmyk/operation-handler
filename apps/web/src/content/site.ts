/** Shared marketing copy for Cars Compound. */

export const SITE = {
  name: "Cars Compound",
  tagline: "Your one-stop auto care shop",
  location: "Marietta, GA",
  address: "350 White Ave SE, Marietta GA 30060",
  phoneDisplay: "(770) 755-5005",
  phoneTel: "+17707555005",
  emailDisplay: "info@carscompound.com",
  emailMailto: "mailto:info@carscompound.com",
  yearsExperience: 15,
  carsRepaired: 5000,
  aboutBlurb:
    "At Cars Compound, we believe in delivering excellence at every turn. As the premier destination for automotive services in Marietta, GA, we specialize in comprehensive car care—from expert collision repairs and maintenance to state-of-the-art upgrades. With over 15 years of experience serving Atlanta and the surrounding areas, our certified technicians use advanced tools and techniques to restore your vehicle to its prime condition.",
  heroEyebrow: "Shop craft + digital tracking",
  heroTitle: "Expert care.",
  heroTitleAccent: "Perfect results.",
  heroSupport:
    "AI damage assessment, live repair tracking, and a customer portal—built around real collision, paint, and ADAS work in Marietta, GA.",
  logoSrc: "/brand/cars-compound-logo.png?v=3",
} as const;

export const HERO_FEATURES = [
  { title: "Certified Technicians", icon: "tech" },
  { title: "Advanced Equipment", icon: "gear" },
  { title: "Quality Guarantee", icon: "shield" },
  { title: "Customer Satisfaction", icon: "heart" },
] as const;

/** Core product features built for Cars Compound digital journey */
export const DIGITAL_FEATURES = [
  {
    n: "01",
    title: "AI Damage Assessment",
    body: "Upload photos and get an advisory estimate from shop pricing bands—then book a physical inspection.",
    href: "/assess",
    cta: "Start AI Assess",
  },
  {
    n: "02",
    title: "Book Appointment",
    body: "Schedule your visit online. We confirm as a CRM lead and prep the shop for your inspection.",
    href: "/book",
    cta: "Book Now",
  },
  {
    n: "03",
    title: "Live Repair Tracking",
    body: "Follow your vehicle stage-by-stage with a secure Tracking ID—photos and updates until pickup.",
    href: "/track",
    cta: "Track a Repair",
  },
  {
    n: "04",
    title: "Customer Portal",
    body: "Your digital garage: repair history, warranties, invoices, and documents in one place.",
    href: "/portal",
    cta: "Open Portal",
  },
] as const;

export const SERVICES = [
  {
    title: "Collision Repair",
    body: "Complete collision restoration—from assessment and structural work through paint-matched finish and delivery.",
    href: "/book",
    image:
      "https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=1400&q=85",
  },
  {
    title: "Paint & Body",
    body: "Precision color matching, panel finishing, and refinishing that brings your vehicle back to showroom quality.",
    href: "/book",
    // Paint booth / refinish visual (not tools rack)
    image:
      "https://images.unsplash.com/photo-1632823469850-2f77dd9c7f93?auto=format&fit=crop&w=1400&q=85",
  },
  {
    title: "Mechanical Repairs",
    body: "Diagnostics and repairs for systems that keep you safe and confident on the road.",
    href: "/book",
    image:
      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1400&q=85",
  },
  {
    title: "Detailing Services",
    body: "Interior and exterior detailing that restores depth, gloss, and that new-car feel.",
    href: "/book",
    image:
      "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1400&q=85",
  },
  {
    title: "ADAS Calibration",
    body: "Keep cameras, radar, and safety systems precise after collision or glass work.",
    href: "/book",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=85",
  },
  {
    title: "AI Damage Assessment",
    body: "Upload photos for an advisory estimate, then book a physical inspection with our team.",
    href: "/assess",
    image:
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1400&q=85",
  },
] as const;

export const WHY_US = [
  {
    title: "Certified Technicians",
    body: "Skilled professionals equipped with state-of-the-art tools and advanced diagnostics.",
  },
  {
    title: "Convenient Location",
    body: "Near the heart of historic Marietta, Georgia—easy access for Atlanta-area drivers.",
  },
  {
    title: "Comprehensive Services",
    body: "From collision repair to ADAS calibration, detailing, AC, and digital tracking—under one roof.",
  },
] as const;

export const WHY_POINTS = [
  "Factory-trained collision specialists",
  "Insurance-friendly estimates & process",
  "OEM-quality parts when required",
  "Live repair tracking from intake to pickup",
  "Warranty-backed workmanship",
] as const;

export const STATS = [
  { value: 15, suffix: "+", label: "Years of Experience", icon: "years" },
  { value: 5000, suffix: "+", label: "Cars Repaired", icon: "cars" },
  { value: 98, suffix: "%", label: "Customer Satisfaction", icon: "smile" },
  { value: 24, suffix: "/7", label: "Support Availability", icon: "clock" },
] as const;

export const PROCESS_STEPS = [
  ["1. AI assess or book", "Upload damage photos or schedule a physical inspection online."],
  ["2. Lead & confirmation", "We capture your details as a CRM lead and confirm your visit."],
  ["3. Physical inspection", "Technicians verify damage and finalize a written estimate."],
  ["4. Repair order", "A secure Tracking ID is issued with portal access via email/SMS."],
  ["5. Live stages", "Follow progress from intake through paint, polish, and road test."],
  ["6. Delivery & care", "Pickup with warranties on file, then follow-ups and maintenance reminders."],
] as const;

export const HOME_PROCESS = [
  {
    n: "01",
    title: "Inspection",
    body: "We assess damage with trained eyes and digital tools.",
  },
  {
    n: "02",
    title: "Estimate",
    body: "Clear pricing and a plan before any work begins.",
  },
  {
    n: "03",
    title: "Repair",
    body: "Skilled technicians restore structure, finish, and systems.",
  },
  {
    n: "04",
    title: "Quality Check",
    body: "Multi-point verification so every detail meets our standard.",
  },
  {
    n: "05",
    title: "Delivery",
    body: "Pickup ready—with tracking history and warranty on file.",
  },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "The ADAS calibration was spot-on, and I can feel the difference in my car's safety features. The technicians were professional and explained everything clearly. Highly recommend!",
    name: "James Carter",
    role: "Marietta, GA",
  },
  {
    quote:
      "Exceptional service from start to finish! The team at Cars Compound repaired my car flawlessly and even handled the insurance process for me. I couldn't be happier with the results!",
    name: "Kino M.",
    role: "Atlanta, GA",
  },
  {
    quote:
      "These guys were amazing. I called around to five different places to get my front bumper and fender fixed. They were $800 cheaper than the quotes I got and three weeks faster!",
    name: "Emily V.",
    role: "Roswell, GA",
  },
  {
    quote:
      "I've been to many auto shops, but none compare to Cars Compound. Their attention to detail and use of quality parts really sets them apart. My car looks and drives like new!",
    name: "Michael Roberts",
    role: "Kennesaw, GA",
  },
] as const;

export const FAQS = [
  {
    q: "Is the AI estimate the final price?",
    a: "No. AI pricing uses Cars Compound shop bands and is advisory only. Final cost is confirmed after physical inspection.",
  },
  {
    q: "How do I track my repair?",
    a: "Use your Tracking ID on the Track page, or sign in to the Customer Portal with email/password or tracking credentials.",
  },
  {
    q: "Do you offer ADAS calibration?",
    a: "Yes. We provide precision ADAS calibration so your safety systems work correctly after collision or glass work.",
  },
  {
    q: "Where are you located?",
    a: "350 White Ave SE, Marietta GA 30060—serving Marietta, Atlanta, and surrounding areas.",
  },
  {
    q: "Will I get SMS updates?",
    a: "Email is primary. SMS is sent when configured and when you have opted in / provided a phone number.",
  },
  {
    q: "Can I see past repairs?",
    a: "Yes. Your digital garage keeps permanent vehicle history, warranties, invoices, and documents.",
  },
] as const;

export const ABOUT_POINTS = [
  "Professional car services",
  "Friendly support when you need it",
  "Great skilled technicians",
  "Premium car maintenance",
  "Fast & reliable repairs",
  "Advanced diagnostic tools",
] as const;

export const IMAGES = {
  hero: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2400&q=85",
  heroAlt: "https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=1800&q=80",
  shop: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1600&q=80",
  detail: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1600&q=80",
  bay: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80",
  paint: "https://images.unsplash.com/photo-1619642751034-765dfdf7c43e?auto=format&fit=crop&w=1600&q=80",
  tech: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1600&q=80",
  showroom: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1600&q=80",
  process: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1600&q=80",
  cta: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2000&q=85",
  why: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1600&q=80",
} as const;

/** Routes that use the light marketing chrome (header/footer/body paper). */
export const LIGHT_ROUTES = [
  "/",
  "/services",
  "/about",
  "/process",
  "/faq",
  "/contact",
  "/assess",
  "/book",
  "/track",
] as const;

export function isLightRoute(pathname: string | null): boolean {
  if (!pathname) return true;
  if (pathname === "/") return true;
  return LIGHT_ROUTES.some((r) => r !== "/" && pathname.startsWith(r));
}
