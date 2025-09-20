import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Camera } from "lucide-react";

const RcmrdGallery = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const images = [
    {
      src: "/lovable-uploads/d9034961-cff4-4a20-ab32-9f62bbcefca4.png",
      title: "Aerial View",
      description: "Beautiful aerial view of our swimming pool complex with sports facilities"
    },
    {
      src: "/lovable-uploads/be707319-3ca8-4eef-9135-5a59ce02637f.png",
      title: "Active Swimming",
      description: "Swimmers enjoying the pristine pool with clear blue water"
    },
    {
      src: "/lovable-uploads/90d2e320-ea58-48bf-af7e-5295b65d1f7d.png",
      title: "Sports Complex",
      description: "Complete recreational facility with football fields and swimming pool"
    },
    {
      src: "/lovable-uploads/ef4d088e-b3a6-4913-a9b0-bb9e3ea4340c.png",
      title: "Pool Deck",
      description: "Professional pool deck with safety equipment and comfortable seating"
    },
    {
      src: "/lovable-uploads/c3a59b6e-bd2c-4fea-a0a9-48bbf2bc4263.png",
      title: "RCMRD Campus",
      description: "Modern RCMRD executive building overlooking the pool facilities"
    },
    {
      src: "/lovable-uploads/33341225-24a6-4ed2-a612-f774ef39ed61.png",
      title: "Golden Hour",
      description: "Stunning sunset view of the entire RCMRD complex and facilities"
    }
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, images.length]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  return (
    <section id="gallery" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
              <Camera className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Photo Gallery</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-light text-foreground">
              Experience Our
              <span className="block font-semibold text-primary">Beautiful Facilities</span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Take a visual tour of our pristine swimming pool complex and discover why RCMRD is the premier choice for aquatic recreation in Nairobi.
            </p>
          </div>

          {/* Main Gallery */}
          <Card className="overflow-hidden border-0 shadow-2xl bg-card/50 backdrop-blur-sm">
            <div className="relative h-96 lg:h-[600px]">
              {/* Main Image */}
              <img 
                src={images[currentIndex].src}
                alt={images[currentIndex].title}
                className="w-full h-full object-cover transition-all duration-700"
              />
              
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              
              {/* Image Info */}
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h3 className="text-2xl font-semibold mb-2">{images[currentIndex].title}</h3>
                <p className="text-lg text-white/90 max-w-2xl">{images[currentIndex].description}</p>
              </div>

              {/* Navigation Arrows */}
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm"
                onClick={goToPrevious}
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm"
                onClick={goToNext}
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </Button>
            </div>
          </Card>

          {/* Thumbnail Navigation */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`relative overflow-hidden rounded-lg transition-all duration-300 hover:scale-105 ${
                  index === currentIndex 
                    ? 'ring-2 ring-primary ring-offset-2' 
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <div className="aspect-video">
                  <img 
                    src={image.src}
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {index === currentIndex && (
                  <div className="absolute inset-0 bg-primary/20"></div>
                )}
              </button>
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center space-x-2 mt-8">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-primary scale-125' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RcmrdGallery;