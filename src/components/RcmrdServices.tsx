import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, UserCheck, PartyPopper, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const RcmrdServices = () => {
  const services = [
    {
      icon: GraduationCap,
      title: "Swimming for Students",
      description: "Dedicated swimming programs designed for students with flexible schedules that accommodate academic commitments.",
      features: ["Student discounted rates", "Group lessons available", "Flexible timing", "Academic semester packages"],
      image: "/lovable-uploads/90d2e320-ea58-48bf-af7e-5295b65d1f7d.png",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Users,
      title: "Family Swimming",
      description: "Family-friendly environment perfect for recreational swimming and quality time together in a safe setting.",
      features: ["Family packages", "Children's swimming areas", "Weekend family hours", "Safety-first approach"],
      image: "/lovable-uploads/be707319-3ca8-4eef-9135-5a59ce02637f.png",
      color: "from-emerald-500 to-teal-500"
    },
    {
      icon: UserCheck,
      title: "Training & Lifeguard Sessions",
      description: "Professional training programs and lifeguard certification courses conducted by certified instructors.",
      features: ["Professional coaching", "Lifeguard certification", "Advanced techniques", "Competitive preparation"],
      image: "/lovable-uploads/ef4d088e-b3a6-4913-a9b0-bb9e3ea4340c.png",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: PartyPopper,
      title: "Event Hosting",
      description: "Host your special events, competitions, and celebrations at our premium swimming facility.",
      features: ["Event coordination", "Equipment rental", "Catering support", "Professional photography"],
      image: "/lovable-uploads/33341225-24a6-4ed2-a612-f774ef39ed61.png",
      color: "from-purple-500 to-pink-500"
    }
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Our Services</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-light text-foreground">
              Swimming Solutions
              <span className="block font-semibold text-primary">For Everyone</span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              From recreational swimming to professional training, we offer comprehensive programs tailored to meet diverse needs and skill levels.
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="group overflow-hidden hover:shadow-xl transition-all duration-500 hover:scale-[1.02] border-0 bg-card/50 backdrop-blur-sm">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={service.image} 
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-80 group-hover:opacity-70 transition-opacity`}></div>
                  <div className="absolute top-4 left-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <service.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                  
                  <ul className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Link to="/auth" className="block pt-2">
                    <Button variant="ghost" className="group/btn hover:bg-primary/10 w-full justify-between">
                      Learn More
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RcmrdServices;