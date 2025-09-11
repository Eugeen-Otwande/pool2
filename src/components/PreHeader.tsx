import { MapPin, Mail, Phone, Clock } from "lucide-react";

const PreHeader = () => {
  return (
    <div className="bg-primary/5 backdrop-blur-sm border-b border-primary/10">
      <div className="container mx-auto px-6 py-2">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-primary/80 space-y-1 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>Kasarani Road, Nairobi</span>
            </div>
            <div className="flex items-center space-x-1">
              <Mail className="w-3 h-3" />
              <span>pool@rcmrd.org</span>
            </div>
            <div className="flex items-center space-x-1">
              <Phone className="w-3 h-3" />
              <span>07XXXXXXXX</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Open Mon–Sun: 8:00AM – 7:00PM</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreHeader;