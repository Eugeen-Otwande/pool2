import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import MembershipPlans from "@/components/MembershipPlans";
import PoolSchedule from "@/components/PoolSchedule";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import Stats from "@/components/Stats";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Features />
      <MembershipPlans />
      <PoolSchedule />
      <Testimonials />
      <Stats />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
