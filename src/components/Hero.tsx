import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Users, Calendar, Package, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/pool-hero.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Modern RCMRD swimming pool facility" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-85"></div>
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
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">RCMRD Aquatic Excellence</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Streamline Your
            <span className="block bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
              Swimming Pool Access
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto leading-relaxed">
            A modern management system for residents, students, staff, and members. 
            Easy check-ins, scheduling, and equipment tracking.
          </p>

          {/* Feature List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-blue-100">Digital Check-In & Access Control</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-blue-100">View Real-Time Pool Schedule</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-blue-100">Manage Equipment Rentals</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-blue-100">Track Your Progress & Visits</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link to="/auth">
              <Button variant="hero" size="lg" className="group">
                Request Access
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="glass" size="lg">
                Already have an account? Sign In
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="bg-white/10 backdrop-blur-glass border border-white/20 rounded-2xl p-6 shadow-glass max-w-md mx-auto">
            <img 
              src={heroImage} 
              alt="Modern swimming pool facility" 
              className="w-full h-32 object-cover rounded-lg mb-4"
            />
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">500+</div>
              <div className="text-sm text-blue-200">Active Members</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;