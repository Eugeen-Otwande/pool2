import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Mail, Phone, Facebook, Instagram, Twitter, Waves, Send } from "lucide-react";
import { Link } from "react-router-dom";

const RcmrdFooter = () => {
  return (
    <footer className="bg-background border-t border-border/50">
      {/* Main Footer */}
      <div className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              
              {/* About Us */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <Waves className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-semibold text-foreground">RCMRD Pool</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Your premier swimming destination in Nairobi. We provide safe, professional, and enjoyable aquatic experiences for swimmers of all ages and skill levels.
                </p>
                <div className="flex space-x-3">
                  <Button variant="outline" size="icon" className="hover:bg-primary hover:text-white transition-colors">
                    <Facebook className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="hover:bg-primary hover:text-white transition-colors">
                    <Instagram className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="hover:bg-primary hover:text-white transition-colors">
                    <Twitter className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Quick Links */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground">Quick Links</h3>
                <ul className="space-y-3">
                  <li>
                    <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">
                      Services
                    </Link>
                  </li>
                  <li>
                    <Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">
                      Memberships
                    </Link>
                  </li>
                  <li>
                    <Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">
                      Gallery
                    </Link>
                  </li>
                  <li>
                    <Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">
                      Booking
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Contact Info */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground">Contact Info</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-muted-foreground text-sm leading-relaxed">
                      Regional Centre For Mapping Complex<br />
                      Kasarani Road<br />
                      P.O. Box 632 Kasarani<br />
                      Nairobi, Kenya
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground text-sm">pool@rcmrd.org</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground text-sm">+254 20 386 0000</span>
                  </div>
                </div>
              </div>

              {/* Newsletter */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground">Stay Updated</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Subscribe to our newsletter for pool updates, events, and special offers.
                </p>
                <div className="space-y-3">
                  <Input 
                    placeholder="Enter your email"
                    className="bg-background/50 border-border/50 focus:border-primary"
                  />
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    <Send className="w-4 h-4 mr-2" />
                    Subscribe
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  By subscribing, you agree to our privacy policy.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-border/50 py-6">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-sm text-muted-foreground">
                © 2025 RCMRD Swimming Pool. All rights reserved.
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <Link to="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
                <Link to="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
                <Link to="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Accessibility
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default RcmrdFooter;