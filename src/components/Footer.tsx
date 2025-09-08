import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Waves, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram,
  Shield,
  Clock,
  Headphones
} from "lucide-react";

const Footer = () => {
  const quickLinks = [
    { label: "Features", href: "#features" },
    { label: "User Roles", href: "#roles" },
    { label: "Pricing", href: "#pricing" },
    { label: "Demo", href: "#demo" }
  ];

  const support = [
    { label: "Documentation", href: "/docs" },
    { label: "API Reference", href: "/api" },
    { label: "Support Center", href: "/support" },
    { label: "System Status", href: "/status" }
  ];

  const legal = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Security", href: "/security" },
    { label: "Compliance", href: "/compliance" }
  ];

  return (
    <footer className="relative overflow-hidden bg-gradient-to-br from-background to-muted/20 border-t border-border/50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-accent rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shadow-glass">
                  <Waves className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Pool Management</h3>
                  <p className="text-sm text-muted-foreground">RCMRD Aquatic System</p>
                </div>
              </div>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Revolutionizing aquatic facility management with comprehensive digital solutions. 
                From access control to analytics, we provide everything you need for modern pool operations.
              </p>

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>RCMRD Campus, Nairobi, Kenya</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>+254 (0) 20 000 0000</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>pool@rcmrd.org</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2">
              <h4 className="text-lg font-semibold text-foreground mb-6">Quick Links</h4>
              <ul className="space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-smooth text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div className="lg:col-span-2">
              <h4 className="text-lg font-semibold text-foreground mb-6">Support</h4>
              <ul className="space-y-3">
                {support.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-smooth text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div className="lg:col-span-2">
              <h4 className="text-lg font-semibold text-foreground mb-6">Legal</h4>
              <ul className="space-y-3">
                {legal.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-smooth text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div className="lg:col-span-2">
              <h4 className="text-lg font-semibold text-foreground mb-6">Stay Updated</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Get the latest updates and feature announcements.
              </p>
              <div className="space-y-3">
                <div className="flex">
                  <input 
                    type="email" 
                    placeholder="Enter email"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button size="sm" className="rounded-l-none">
                    Subscribe
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator className="opacity-20" />

        {/* Bottom Section */}
        <div className="py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Copyright */}
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © 2024 RCMRD Pool Management System. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Secure
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  24/7 Support
                </Badge>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground mr-2">Follow us:</span>
              {[
                { icon: Facebook, href: "#", label: "Facebook" },
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: Linkedin, href: "#", label: "LinkedIn" },
                { icon: Instagram, href: "#", label: "Instagram" }
              ].map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-8 h-8 bg-muted hover:bg-primary rounded-lg flex items-center justify-center transition-smooth group"
                >
                  <social.icon className="w-4 h-4 text-muted-foreground group-hover:text-white" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="pb-8">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Headphones className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Emergency Support</p>
                <p className="text-xs text-muted-foreground">24/7 technical assistance available</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Contact Emergency Support
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;