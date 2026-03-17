import React from "react";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";

export default function Layout({ children, pageName = "" }) {
  // Track page view on mount
  React.useEffect(() => {
    if (pageName) {
      // Analytics tracking would go here
      // trackPageView(pageName);
    }
  }, [pageName]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
