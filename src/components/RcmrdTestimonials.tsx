import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";

const RcmrdTestimonials = () => {
  const testimonials = [
    {
      name: "Sarah Njuguna",
      role: "University Student",
      content: "The RCMRD swimming pool has been perfect for my fitness routine. The facilities are clean, professional, and the staff is incredibly helpful. As a student, I appreciate the affordable rates and flexible timing.",
      rating: 5,
      initials: "SN"
    },
    {
      name: "Dr. Michael Ochieng",
      role: "RCMRD Resident",
      content: "Living at RCMRD and having access to this world-class swimming facility is a privilege. My family and I use it regularly. The safety standards are excellent, and it's the perfect place for both exercise and relaxation.",
      rating: 5,
      initials: "MO"
    },
    {
      name: "Grace Wanjiku",
      role: "Swimming Coach",
      content: "I've trained swimmers at various facilities across Nairobi, and RCMRD pool stands out for its professional-grade infrastructure. The pool meets international standards, making it ideal for competitive training.",
      rating: 5,
      initials: "GW"
    },
    {
      name: "James Mwangi",
      role: "Visiting Professional",
      content: "As a visitor to RCMRD, I was impressed by the pool's accessibility and the warm welcome from the staff. The booking system is efficient, and the facilities exceed expectations for both business and leisure use.",
      rating: 5,
      initials: "JM"
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
              <Quote className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">What People Say</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-light text-foreground">
              Community
              <span className="block font-semibold text-primary">Feedback</span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Don't just take our word for it. Hear from our community of swimmers, students, residents, and visitors who have experienced the excellence of RCMRD Swimming Pool.
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-8 space-y-6">
                  {/* Quote Icon */}
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Quote className="w-6 h-6 text-primary" />
                  </div>

                  {/* Rating */}
                  <div className="flex items-center space-x-1">
                    {[...Array(testimonial.rating)].map((_, starIndex) => (
                      <Star key={starIndex} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  {/* Content */}
                  <blockquote className="text-muted-foreground leading-relaxed text-lg">
                    "{testimonial.content}"
                  </blockquote>

                  {/* Author */}
                  <div className="flex items-center space-x-4 pt-4 border-t border-border/50">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {testimonial.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-8 bg-card/50 backdrop-blur-sm rounded-full px-8 py-4 border border-border/50">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Happy Members</div>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">4.9</div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">15+</div>
                <div className="text-sm text-muted-foreground">Years of Service</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RcmrdTestimonials;