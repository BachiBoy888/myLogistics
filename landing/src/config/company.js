// Prolife company configuration
// White-label v1: Centralized company-specific values

export const COMPANY = {
  name: "Prolife",
  fullName: "Prolife Logistics",
  tagline: "Логистика без границ",
  description: "Надежные грузоперевозки из Китая и Юго-Восточной Азии",
  
  contacts: {
    phone: "+996 990 11 11 25",
    phoneRaw: "+996990111125", // for WhatsApp/tel links
    whatsapp: "+996990111125",
    telegram: "prolife_logistics",
    email: "office@prolife.kg",
    address: "Бишкек, Бизнес центр Monolit, Льва Толстого, 36к/1",
    officeName: "Бизнес центр Monolit",
    workHours: "Пн-Пт: 9:00 - 18:00",
  },
  
  social: {
    instagram: "https://instagram.com/prolife.kg",
    facebook: "https://facebook.com/prolife.kg",
  },
  
  // Brand colors extracted from website style
  colors: {
    primary: "#1a365d",      // Dark blue
    secondary: "#2b6cb0",    // Medium blue
    accent: "#38a169",       // Green for success/actions
    orange: "#ed8936",       // Orange accent
    text: "#2d3748",
    textLight: "#718096",
    background: "#ffffff",
    backgroundAlt: "#f7fafc",
  },
  
  // Logo placeholder - should be replaced with actual logo file
  logo: {
    src: "/images/logo.svg",
    alt: "Prolife Logistics",
    width: 140,
    height: 40,
  },
  
  // For favicon and app icons
  favicon: "/images/favicon.ico",
  
  // Established year for trust signals
  established: 2015,
};

export default COMPANY;
