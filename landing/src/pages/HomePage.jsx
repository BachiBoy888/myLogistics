import React, { useState, useEffect } from "react";
import Layout from "../components/Layout.jsx";
import HeroNew from "../sections/HeroNew.jsx";
import RoutesNew from "../sections/RoutesNew.jsx";
import FeaturesNew from "../sections/FeaturesNew.jsx";
import StepsSection from "../sections/StepsSection.jsx";
import ServicesGrid from "../sections/ServicesGrid.jsx";
import TestimonialsSection from "../sections/TestimonialsSection.jsx";
import CalculatorModal from "../sections/CalculatorModal.jsx";
import FAQ from "../sections/FAQ.jsx";
import SEO from "../config/seo.js";

// Page metadata for prerender
export const metadata = SEO.pages.home;

export default function HomePage() {
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorData, setCalculatorData] = useState({
    weight: "",
    volume: "",
    type: "auto",
  });

  useEffect(() => {
    const handleInput = (e) => {
      const { field, value } = e.detail;
      setCalculatorData((prev) => ({ ...prev, [field]: value }));
    };
    window.addEventListener("calculator:input", handleInput);
    return () => window.removeEventListener("calculator:input", handleInput);
  }, []);

  const openCalculator = () => {
    setShowCalculator(true);
  };

  return (
    <Layout pageName="home">
      <HeroNew onCalculateClick={openCalculator} />
      <RoutesNew />
      <FeaturesNew />
      <StepsSection />
      <ServicesGrid />
      <TestimonialsSection />
      <FAQ />
      
      {showCalculator && (
        <CalculatorModal
          initialData={calculatorData}
          onClose={() => setShowCalculator(false)}
        />
      )}
    </Layout>
  );
}
