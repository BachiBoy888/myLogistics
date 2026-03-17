import React from "react";
import Layout from "../components/Layout.jsx";
import Hero from "../sections/Hero.jsx";
import Calculator from "../sections/Calculator.jsx";
import Advantages from "../sections/Advantages.jsx";
import HowItWorks from "../sections/HowItWorks.jsx";
import Routes from "../sections/Routes.jsx";
import FAQ from "../sections/FAQ.jsx";
import CTABlock from "../sections/CTABlock.jsx";
import SEO from "../config/seo.js";

// Page metadata for prerender
export const metadata = SEO.pages.home;

export default function HomePage() {
  const scrollToCalculator = () => {
    document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Layout pageName="home">
      <Hero onCalculateClick={scrollToCalculator} />
      <Calculator />
      <Advantages />
      <HowItWorks />
      <Routes />
      <FAQ />
      <CTABlock />
    </Layout>
  );
}
