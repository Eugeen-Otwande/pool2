import { Shield, Users, Award, Waves } from "lucide-react";

const RcmrdAbout = () => {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
              <Waves className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">About RCMRD Pool</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-light text-foreground">
              Where Excellence
              <span className="block font-semibold text-primary">Meets Innovation</span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              At RCMRD Swimming Pool, we provide a safe and enjoyable environment for swimmers of all ages. Whether you're a student, resident, visitor, or professional athlete, our pool is equipped for both recreation and training.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-4 group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Safe Environment</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Professional lifeguards and safety protocols ensure a secure swimming experience for everyone.
              </p>
            </div>

            <div className="text-center space-y-4 group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">All Ages Welcome</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                From children learning to swim to professional athletes training, everyone finds their place here.
              </p>
            </div>

            <div className="text-center space-y-4 group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Professional Standard</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Olympic-standard pool facilities with proper lane markings and professional equipment.
              </p>
            </div>

            <div className="text-center space-y-4 group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <Waves className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Accessible Location</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Conveniently located in Kasarani with ample parking and easy access for all visitors.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RcmrdAbout;