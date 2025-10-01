import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import rcmrdLogo from "@/assets/rcmrd-logo.png";
const RcmrdHero = () => {
  const [scrollY, setScrollY] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    const initMap = () => {
      if (mapRef.current && (window as any).google) {
        const map = new (window as any).google.maps.Map(mapRef.current, {
          center: {
            lat: -1.2209732976165677,
            lng: 36.893965203848495
          },
          zoom: 15,
          styles: [{
            featureType: "all",
            elementType: "geometry.fill",
            stylers: [{
              color: "#1e40af"
            }]
          }, {
            featureType: "water",
            elementType: "geometry",
            stylers: [{
              color: "#0ea5e9"
            }]
          }]
        });
        new (window as any).google.maps.Marker({
          position: {
            lat: -1.2209732976165677,
            lng: 36.893965203848495
          },
          map: map,
          title: "RCMRD Swimming Pool"
        });
      }
    };
    if (!(window as any).google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dO5A2&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, []);
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Parallax Background */}
      <div className="absolute inset-0 z-0" style={{
      transform: `translateY(${scrollY * 0.5}px)`
    }}>
        <img src="/lovable-uploads/d9034961-cff4-4a20-ab32-9f62bbcefca4.png" alt="RCMRD Swimming Pool Aerial View" className="w-full h-[120%] object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60"></div>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/5 rounded-full backdrop-blur-sm animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-white/5 rounded-full backdrop-blur-sm animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-white/5 rounded-full backdrop-blur-sm animate-pulse delay-500"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center text-white">
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
          {/* Location Badge */}
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 shadow-glass">
            <img src={rcmrdLogo} alt="RCMRD Logo" className="h-10 w-auto" />
            <span className="text-sm font-medium">RCMRD Swimming Pool Complex</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-light leading-tight tracking-tight">
              Welcome to
              <span className="block font-semibold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                RCMRD Swimming Pool
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl font-light text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Your recreational and training hub in Nairobi
            </p>
          </div>

          {/* Description */}
          <p className="text-lg text-blue-200/90 max-w-2xl mx-auto leading-relaxed">
            A safe and professional environment for swimmers of all ages. Perfect for students, residents, visitors, and athletes seeking both recreation and training excellence.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-4">
            <Link to="/book-swim">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-medium px-8 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                Book a Swim
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 font-medium px-8 py-4 rounded-full backdrop-blur-sm">
                Request Access
              </Button>
            </Link>
          </div>

          {/* Location Map Section */}
          

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto pt-8">
            <div className="text-center space-y-2">
              <div className="text-4xl font-light text-white">500+</div>
              <div className="text-sm text-blue-200 uppercase tracking-wider">Active Members</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl font-light text-white">15+</div>
              <div className="text-sm text-blue-200 uppercase tracking-wider">Years of Excellence</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl font-light text-white">7</div>
              <div className="text-sm text-blue-200 uppercase tracking-wider">Days Open</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>;
};
export default RcmrdHero;