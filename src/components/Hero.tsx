import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Shield, Users, BarChart3 } from "lucide-react";
import heroImage from "@/assets/pool-hero.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Modern swimming pool facility" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-80"></div>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full backdrop-blur-glass animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-white/10 rounded-full backdrop-blur-glass animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-white/10 rounded-full backdrop-blur-glass animate-pulse delay-500"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center text-white">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-glass border border-white/20 rounded-full px-4 py-2 mb-8 shadow-glass">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">RCMRD Aquatic Excellence</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Revolutionary
            <span className="block bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
              Pool Management
            </span>
            System
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Transform your aquatic facility with our comprehensive digital platform. 
            Real-time monitoring, seamless access control, and data-driven insights.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur-glass border border-white/20 rounded-lg px-6 py-4 shadow-glass">
              <div className="text-3xl font-bold">75%</div>
              <div className="text-sm text-blue-200">Reduced Admin Work</div>
            </div>
            <div className="bg-white/10 backdrop-blur-glass border border-white/20 rounded-lg px-6 py-4 shadow-glass">
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-blue-200">Concurrent Users</div>
            </div>
            <div className="bg-white/10 backdrop-blur-glass border border-white/20 rounded-lg px-6 py-4 shadow-glass">
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm text-blue-200">Uptime SLA</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="hero" size="lg" className="group">
              Get Started Today
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="glass" size="lg" className="group">
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-blue-200">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="text-sm">Multi-Role Access</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm">Real-Time Analytics</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;