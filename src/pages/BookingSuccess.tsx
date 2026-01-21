import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Home, Calendar, Clock, Users, Mail, Phone, ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { downloadGatePassPDF, GatePassData } from '@/utils/generateGatePassPDF';
import { toast } from 'sonner';

interface BookingDetails {
  id: string;
  bookingReference: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfVisit: string;
  timeOfVisit: string;
  numGuests: number;
  emailSent?: boolean;
  emailError?: string;
}

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);

  useEffect(() => {
    // Get booking details from navigation state
    const state = location.state as BookingDetails | null;
    
    if (!state) {
      // No booking details - redirect to booking page
      navigate('/book-swim');
      return;
    }

    setBookingDetails(state);
  }, [location.state, navigate]);

  const handleDownloadPDF = async () => {
    if (!bookingDetails) return;

    setIsDownloading(true);
    try {
      const gatePassData: GatePassData = {
        bookingReference: bookingDetails.bookingReference,
        fullName: `${bookingDetails.firstName} ${bookingDetails.lastName}`,
        email: bookingDetails.email,
        phone: bookingDetails.phone,
        bookingDate: new Date(bookingDetails.dateOfVisit).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        preferredTime: bookingDetails.timeOfVisit,
        numberOfGuests: bookingDetails.numGuests,
        expectedEntryTime: bookingDetails.timeOfVisit
      };

      await downloadGatePassPDF(gatePassData);
      toast.success('Gate pass downloaded successfully!');
    } catch (error) {
      console.error('Error downloading gate pass:', error);
      toast.error('Failed to download gate pass. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!bookingDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{
          backgroundImage: `url('/lovable-uploads/c3a59b6e-bd2c-4fea-a0a9-48bbf2bc4263.png')`
        }}
      />

      {/* Navigation */}
      <div className="relative z-10 pt-8 px-6">
        <Link to="/">
          <Button variant="outline" className="bg-card/80 hover:bg-card border-border">
            <Home className="w-4 h-4 mr-2" />
            Back to Homepage
          </Button>
        </Link>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto max-w-2xl px-6 py-8">
        <Card className="bg-card/95 backdrop-blur-sm shadow-xl border-border overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 py-8 px-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h1>
            <p className="text-white/90">Your swim session has been successfully booked</p>
          </div>

          <CardHeader className="text-center pb-2">
            <CardDescription className="text-muted-foreground">
              Booking Reference
            </CardDescription>
            <CardTitle className="text-2xl font-mono tracking-wider text-primary">
              {bookingDetails.bookingReference}
            </CardTitle>
          </CardHeader>

            {/* Email Status */}
            {bookingDetails.emailSent !== undefined && (
              <div className={`mx-6 mb-4 p-3 rounded-lg flex items-center gap-2 ${
                bookingDetails.emailSent 
                  ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900' 
                  : 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900'
              }`}>
                {bookingDetails.emailSent ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-800 dark:text-green-200">
                      Gate pass sent to <strong>{bookingDetails.email}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm text-yellow-800 dark:text-yellow-200">
                      Email could not be sent. Please download your gate pass below.
                    </span>
                  </>
                )}
              </div>
            )}

          <CardContent className="space-y-6">
            {/* Booking Details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Booking Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Guest Name</p>
                  <p className="font-medium text-foreground">
                    {bookingDetails.firstName} {bookingDetails.lastName}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </p>
                  <p className="font-medium text-foreground">{bookingDetails.email}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </p>
                  <p className="font-medium text-foreground">{bookingDetails.phone}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Date
                  </p>
                  <p className="font-medium text-foreground">
                    {new Date(bookingDetails.dateOfVisit).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Time
                  </p>
                  <p className="font-medium text-foreground">{bookingDetails.timeOfVisit}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" /> Guests
                  </p>
                  <p className="font-medium text-foreground">{bookingDetails.numGuests}</p>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <Button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="w-full h-14 text-lg bg-primary hover:bg-primary/90"
              size="lg"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Gate Pass...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download Gate Pass (PDF)
                </>
              )}
            </Button>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Important Information
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Please present your gate pass at the entrance</li>
                <li>• Arrive at least 10 minutes before your scheduled time</li>
                <li>• Bring appropriate swimwear and towels</li>
                <li>• Payment will be collected at the facility</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate('/book-swim')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Book Another Session
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate('/')}
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingSuccess;
