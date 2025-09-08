import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, Shield, Users, Target, Zap } from "lucide-react";

const Stats = () => {
  const stats = [
    {
      icon: TrendingUp,
      value: "75%",
      label: "Admin Workload Reduction",
      description: "Automated processes eliminate manual tasks",
      color: "text-emerald-400"
    },
    {
      icon: Clock,
      value: "60%",
      label: "Faster Check-in Process",
      description: "QR code technology speeds up access",
      color: "text-blue-400"
    },
    {
      icon: Shield,
      value: "99.9%",
      label: "System Uptime",
      description: "Enterprise-grade reliability and availability",
      color: "text-purple-400"
    },
    {
      icon: Users,
      value: "500+",
      label: "Concurrent Users",
      description: "Peak hour support capacity",
      color: "text-cyan-400"
    },
    {
      icon: Target,
      value: "90%",
      label: "User Satisfaction",
      description: "Improved experience across all roles",
      color: "text-orange-400"
    },
    {
      icon: Zap,
      value: "<2s",
      label: "Response Time",
      description: "Lightning-fast system performance",
      color: "text-yellow-400"
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card/20 to-muted/20"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Performance Metrics
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Proven Results &
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Measurable Impact
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our comprehensive platform delivers tangible improvements across all operational metrics,
            ensuring maximum efficiency and user satisfaction.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="group">
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:shadow-glass transition-smooth hover:bg-card/70">
                {/* Icon */}
                <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-xl mb-6 group-hover:bg-primary/20 transition-smooth">
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
                
                {/* Value */}
                <div className="text-4xl md:text-5xl font-bold mb-2 text-card-foreground">
                  {stat.value}
                </div>
                
                {/* Label */}
                <h3 className="text-lg font-semibold mb-2 text-card-foreground">
                  {stat.label}
                </h3>
                
                {/* Description */}
                <p className="text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-card border border-white/20 backdrop-blur-glass rounded-2xl p-8 shadow-glass inline-block">
            <h3 className="text-2xl font-bold text-white mb-3">
              Ready to Transform Your Pool Operations?
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl">
              Join the digital revolution in aquatic facility management with proven results and 
              enterprise-grade reliability.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-primary px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-smooth">
                Schedule Demo
              </button>
              <button className="bg-white/10 text-white border border-white/20 px-6 py-3 rounded-lg font-semibold hover:bg-white/20 transition-smooth">
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Stats;