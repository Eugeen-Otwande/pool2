import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star } from "lucide-react";
import { Link } from "react-router-dom";

const MembershipPlans = () => {
  const plans = [
    {
      name: "Basic",
      price: "$29",
      period: "per month",
      description: "Perfect for occasional swimmers",
      features: [
        "10 pool sessions per month",
        "Digital check-in access",
        "Schedule viewing",
        "Basic equipment rental"
      ],
      buttonText: "Choose Basic",
      popular: false
    },
    {
      name: "Premium",
      price: "$59",
      period: "per month",
      description: "Most popular choice for regular swimmers",
      features: [
        "Unlimited pool sessions",
        "Priority booking",
        "All equipment included",
        "Personal progress tracking",
        "Guest passes (2 per month)"
      ],
      buttonText: "Choose Premium",
      popular: true
    },
    {
      name: "VIP",
      price: "$99",
      period: "per month",
      description: "Ultimate swimming experience",
      features: [
        "All Premium features",
        "Private lane access",
        "Personal training sessions",
        "Concierge service",
        "Unlimited guest passes"
      ],
      buttonText: "Choose VIP",
      popular: false
    }
  ];

  return (
    <section id="membership" className="py-24 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Membership Plans
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Choose the perfect plan
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              for your swimming needs
            </span>
          </h2>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative group hover:shadow-glass transition-smooth overflow-hidden ${
                plan.popular 
                  ? 'border-primary/50 bg-card/80 backdrop-blur-sm scale-105' 
                  : 'border-border/50 bg-card/50 backdrop-blur-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-hero text-white shadow-glass">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-card-foreground">
                  {plan.name}
                </CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">{plan.period}</span>
                </div>
                <p className="text-muted-foreground mt-2">{plan.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-card-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="pt-6">
                  <Link to="/auth">
                    <Button 
                      className={`w-full ${
                        plan.popular 
                          ? 'bg-gradient-hero hover:opacity-90' 
                          : ''
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.buttonText}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MembershipPlans;