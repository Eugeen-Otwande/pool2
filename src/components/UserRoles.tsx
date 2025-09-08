import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Crown, 
  Settings, 
  UserCheck, 
  GraduationCap, 
  Users, 
  Home, 
  UserPlus,
  ArrowRight 
} from "lucide-react";

const UserRoles = () => {
  const roles = [
    {
      icon: Crown,
      title: "System Administrator",
      description: "Complete system oversight with configuration management, analytics, and approval authority.",
      features: ["Full system control", "User management", "System-wide reporting", "Configuration access"],
      gradient: "bg-gradient-admin",
      userType: "Admin Staff"
    },
    {
      icon: Settings,
      title: "Pool Administrator",
      description: "Daily operational management with user oversight and equipment coordination.",
      features: ["Daily operations", "User approval", "Schedule management", "Equipment tracking"],
      gradient: "bg-gradient-staff",
      userType: "Operations"
    },
    {
      icon: UserCheck,
      title: "Pool Staff",
      description: "On-site management with real-time monitoring and incident response capabilities.",
      features: ["Check-in verification", "Capacity monitoring", "Equipment issuance", "Incident reporting"],
      gradient: "bg-gradient-student",
      userType: "Staff"
    },
    {
      icon: GraduationCap,
      title: "Students",
      description: "Designated access hours with progress tracking and skill development features.",
      features: ["Student hour access", "Progress tracking", "Skill development", "Visit history"],
      gradient: "bg-gradient-residence",
      userType: "Academic"
    },
    {
      icon: Users,
      title: "Members",
      description: "Subscription-based access with extended privileges and family account options.",
      features: ["Extended access", "Family accounts", "Payment history", "Premium features"],
      gradient: "bg-gradient-member",
      userType: "Membership"
    },
    {
      icon: Home,
      title: "Residents",
      description: "Housing-affiliated access with guest management during designated residence hours.",
      features: ["Residence hours", "Guest management", "Housing integration", "Community access"],
      gradient: "bg-gradient-admin",
      userType: "Housing"
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/10"></div>
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            User Management
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Tailored Access for
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Every User Type
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our role-based system ensures each user has the perfect experience with 
            appropriate access levels and customized interfaces.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {roles.map((role, index) => (
            <Card key={index} className="relative group hover:shadow-glass transition-smooth overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
              {/* Role Type Badge */}
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="text-xs">
                  {role.userType}
                </Badge>
              </div>
              
              {/* Gradient Background */}
              <div className={`absolute inset-0 ${role.gradient} opacity-5 group-hover:opacity-10 transition-smooth`}></div>
              
              <div className="relative p-6">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl ${role.gradient} flex items-center justify-center mb-4 shadow-glass`}>
                  <role.icon className="w-7 h-7 text-white" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold mb-3 text-card-foreground">{role.title}</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">{role.description}</p>
                
                {/* Features List */}
                <ul className="space-y-2 mb-6">
                  {role.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                {/* Learn More Button */}
                <Button variant="ghost" className="w-full group/btn">
                  Learn More
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Visitor Access Call-out */}
        <div className="bg-gradient-card border border-white/20 backdrop-blur-glass rounded-2xl p-8 shadow-glass text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Visitor Access</h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            One-time access for visitors with integrated payment processing and temporary credential issuance. 
            No account required for quick facility access.
          </p>
          <Button variant="glass" className="mx-auto">
            Process Visitor Access
          </Button>
        </div>
      </div>
    </section>
  );
};

export default UserRoles;