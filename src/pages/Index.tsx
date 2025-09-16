import PreHeader from "@/components/PreHeader";
import Navigation from "@/components/Navigation";
import RcmrdHero from "@/components/RcmrdHero";
import RcmrdAbout from "@/components/RcmrdAbout";
import RcmrdServices from "@/components/RcmrdServices";
import RcmrdLocation from "@/components/RcmrdLocation";
import RcmrdGallery from "@/components/RcmrdGallery";
import RcmrdTestimonials from "@/components/RcmrdTestimonials";
import ContactForm from "@/components/ContactForm";
import RcmrdFooter from "@/components/RcmrdFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <PreHeader />
      <Navigation />
      <RcmrdHero />
      <RcmrdAbout />
      <RcmrdServices />
      <RcmrdLocation />
      <RcmrdGallery />
      <RcmrdTestimonials />
      <ContactForm />
      <RcmrdFooter />
    </div>
  );
};

export default Index;
