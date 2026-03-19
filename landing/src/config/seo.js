// SEO configuration for all landing pages
// White-label v1: Centralized meta tags and SEO data

const SITE_URL = "https://prolife.kg"; // Change for white-label deployment

export const SEO = {
  // Global site settings
  siteName: "Prolife Logistics",
  siteUrl: SITE_URL,
  defaultImage: "/images/og-default.jpg",
  locale: "ru_RU",
  
  // Page-specific meta
  pages: {
    home: {
      title: "Доставка из Китая в Бишкек от $2.9/кг | Prolife Cargo",
      description: "Карго доставка из Китая в Кыргызстан от $2.9 за кг. Рассчитайте стоимость онлайн. Склад в Гуанчжоу, консолидация, доставка 12-15 дней. Надежные грузоперевозки из Китая.",
      keywords: "карго китай бишкек, доставка из китая бишкек, доставка из китая кыргызстан, карго из китая цена за кг, карго китай кыргызстан, доставка 1688 кыргызстан, карго 1688 бишкек, доставка таобао кыргызстан",
      ogImage: "/images/og-home.jpg",
      priority: "1.0",
    },
    
    delivery: {
      title: "Доставка грузов из Китая в Бишкек | Карго из Гуанчжоу, Иу",
      description: "Доставка грузов из Китая в Кыргызстан. Маршруты из Гуанчжоу, Иу, Шэньчжэня. Авто и авиа доставка. Таможенное оформление. Рассчитайте стоимость.",
      keywords: "карго гуанчжоу бишкек, доставка из китая стоимость, доставка товара из китая, карго китай цена, доставка из иу в бишкек",
      ogImage: "/images/og-delivery.jpg",
      priority: "0.9",
    },
    
    calculator: {
      title: "Калькулятор доставки из Китая | Рассчитать стоимость карго",
      description: "Онлайн калькулятор доставки из Китая в Кыргызстан. Узнайте стоимость за 30 секунд. Доставка от $2.9/кг. Отправьте заявку прямо сейчас.",
      keywords: "калькулятор доставки из китая, стоимость доставки из китая, рассчитать доставку из китая, карго калькулятор",
      ogImage: "/images/og-calculator.jpg",
      priority: "1.0",
    },
    
    howItWorks: {
      title: "Как работает доставка из Китая | Этапы и сроки | Prolife",
      description: "Как заказать доставку груза из Китая в Кыргызстан. 4 простых шага: склад в Китае, консолидация, доставка, получение. Узнайте подробнее.",
      keywords: "как привезти товар из китая, доставка из китая этапы, как заказать доставку из китая, карго доставка процесс",
      ogImage: "/images/og-how-it-works.jpg",
      priority: "0.8",
    },
    
    contacts: {
      title: "Контакты Prolife | Офис в Бишкеке | WhatsApp, Telegram",
      description: "Свяжитесь с нами: +996 990 11 11 25. Офис в Бишкеке: Льва Толстого, 36к/1. WhatsApp, Telegram, Email. Рассчитаем доставку за 5 минут.",
      keywords: "контакты prolife, prolife бишкек, телефон prolife, whatsapp доставка китай",
      ogImage: "/images/og-contacts.jpg",
      priority: "0.8",
    },
  },
  
  // Structured data schemas
  schemas: {
    organization: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Prolife Logistics",
      url: SITE_URL,
      logo: `${SITE_URL}/images/logo.png`,
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+996-990-11-11-25",
        contactType: "customer service",
        availableLanguage: ["Russian", "Kyrgyz"],
      },
      address: {
        "@type": "PostalAddress",
        addressCountry: "KG",
        addressLocality: "Бишкек",
        streetAddress: "Льва Толстого, 36к/1, Бизнес центр Monolit",
      },
    },
    
    service: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Доставка грузов из Китая",
      provider: {
        "@type": "Organization",
        name: "Prolife Logistics",
      },
      areaServed: {
        "@type": "Country",
        name: "Кыргызстан",
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Услуги доставки",
        itemListElement: [
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Автодоставка из Китая",
              description: "Доставка 12-15 дней от $2.9/кг",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Авиадоставка из Китая",
              description: "Доставка 5-7 дней от $5.5/кг",
            },
          },
        ],
      },
    },
  },
};

export const getPageMeta = (pageKey) => {
  const page = SEO.pages[pageKey];
  if (!page) return SEO.pages.home;
  return page;
};

export default SEO;
