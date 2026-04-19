import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ServicesGrid from "@/components/ServicesGrid";
import Features from "@/components/Features";
import HomeContent from "@/components/HomeContent";
import UsagePlans from "@/components/UsagePlans";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ServicesGrid />
        <UsagePlans />
        <Features />
        <HomeContent />
      </main>
      <Footer />
    </div>
  );
}

