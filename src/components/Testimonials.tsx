import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Quote } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      quote: "This system made managing our community pool so much easier. The reporting feature is a lifesaver!",
      author: "Sarah K.",
      role: "Pool Administrator",
      avatar: "S"
    },
    {
      quote: "I love being able to see how crowded the pool is before I walk over. The check-in process is effortless.",
      author: "Mark T.",
      role: "Resident",
      avatar: "M"
    }
  ];

  const organizations = [
    "RCMRD University",
    "Community Sports Center", 
    "Premier Fitness Club"
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Trusted By Thousands of Swimmers
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            See what our community
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              members have to say
            </span>
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-glass transition-smooth">
              <CardContent className="p-6">
                <Quote className="w-8 h-8 text-primary/30 mb-4" />
                <blockquote className="text-lg text-card-foreground mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-hero text-white">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-card-foreground">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trusted Organizations */}
        <div className="text-center">
          <p className="text-muted-foreground mb-8">Trusted by organizations like:</p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {organizations.map((org, index) => (
              <div 
                key={index}
                className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg px-6 py-3 text-card-foreground font-medium shadow-glass"
              >
                {org}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;