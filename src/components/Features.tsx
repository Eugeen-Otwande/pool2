import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  QrCode, 
  Calendar, 
  Package, 
  TrendingUp, 
  MessageCircle, 
  CreditCard,
  Shield,
  Clock,
  Users,
  BarChart3,
  Smartphone,
  Zap
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: QrCode,
      title: "Smart Access Control",
      description: "QR code-based check-in/check-out system with real-time capacity monitoring and automated access management.",
      gradient: "bg-gradient-admin",
      color: "text-blue-300"
    },
    {
      icon: Calendar,
      title: "Dynamic Scheduling",
      description: "Visual timetable with role-based allocations, conflict detection, and automated waitlist management.",
      gradient: "bg-gradient-student",
      color: "text-cyan-300"
    },
    {
      icon: Package,
      title: "Equipment Tracking",
      description: "RFID/barcode equipment management with reservation system and automated maintenance scheduling.",
      gradient: "bg-gradient-staff",
      color: "text-indigo-300"
    },
    {
      icon: TrendingUp,
      title: "Progress Analytics",
      description: "Comprehensive tracking of user progress, skill development, and performance metrics with badges.",
      gradient: "bg-gradient-residence",
      color: "text-purple-300"
    },
    {
      icon: MessageCircle,
      title: "Communication Hub",
      description: "Targeted messaging, broadcast announcements, emergency alerts with multi-channel delivery.",
      gradient: "bg-gradient-member",
      color: "text-emerald-300"
    },
    {
      icon: CreditCard,
      title: "Payment Integration",
      description: "Seamless payment processing with M-Pesa, automated renewals, and financial reporting.",
      gradient: "bg-gradient-admin",
      color: "text-orange-300"
    }
  ];

  const highlights = [
    { icon: Shield, label: "Enterprise Security", value: "End-to-end encryption" },
    { icon: Clock, label: "Real-time Monitoring", value: "< 2s response time" },
    { icon: Users, label: "Multi-role Support", value: "7 distinct user types" },
    { icon: BarChart3, label: "Advanced Analytics", value: "Predictive insights" },
    { icon: Smartphone, label: "Mobile Ready", value: "Responsive design" },
    { icon: Zap, label: "High Performance", value: "99.9% uptime SLA" }
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Comprehensive Features
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Everything You Need to
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Manage Your Pool
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our integrated platform covers every aspect of pool management, from access control 
            to analytics, providing a seamless experience for all stakeholders.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="relative group hover:shadow-glass transition-smooth overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
              {/* Gradient Background */}
              <div className={`absolute inset-0 ${feature.gradient} opacity-5 group-hover:opacity-10 transition-smooth`}></div>
              
              <div className="relative p-6">
                <div className={`w-12 h-12 rounded-lg ${feature.gradient} flex items-center justify-center mb-4 shadow-glass`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-card-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Highlights Bar */}
        <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-glass">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {highlights.map((highlight, index) => (
              <div key={index} className="text-center group">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 mx-auto group-hover:bg-primary/20 transition-smooth">
                  <highlight.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-sm font-medium text-card-foreground mb-1">{highlight.label}</div>
                <div className="text-xs text-muted-foreground">{highlight.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;