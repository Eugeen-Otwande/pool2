import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Home, Calendar, Clock, Users, Mail, Phone, ArrowLeft, Loader2, CreditCard, Copy, Check } from 'lucide-react';
import { downloadGatePassPDF, GatePassData } from '@/utils/generateGatePassPDF';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BookingState {
  bookingId: string;
  referenceCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bookingDate: string;
  timeSlot: string;
  numGuests: number;
  amount: number;
  status: string;
  paymentStatus: string;
}

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const [booking, setBooking] = useState<BookingState | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const state = location.state as BookingState | null;
    if (!state) {
      navigate('/book-swim');
      return;
    }
    setBooking(state);
    if (state.status === 'confirmed' && state.paymentStatus === 'paid') {
      setPaymentConfirmed(true);
    }
  }, [location.state, navigate]);

  const handleConfirmPayment = async () => {
    if (!booking) return;
    setConfirmingPayment(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          gatepass_generated: true
        })
        .eq('id', booking.bookingId);

      if (error) throw error;

      setPaymentConfirmed(true);
      setBooking(prev => prev ? { ...prev, status: 'confirmed', paymentStatus: 'paid' } : null);
      toast.success('Payment confirmed! Your gate pass is ready for download.');
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Failed to confirm payment. Please try again.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!booking) return;
    setIsDownloading(true);
    try {
      const gatePassData: GatePassData = {
        bookingReference: booking.referenceCode,
        fullName: `${booking.firstName} ${booking.lastName}`,
        email: booking.email,
        phone: booking.phone,
        bookingDate: new Date(booking.bookingDate).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }),
        preferredTime: booking.timeSlot,
        numberOfGuests: booking.numGuests,
        expectedEntryTime: booking.timeSlot,
        paymentStatus: 'Paid',
        amount: booking.amount
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

  const handleCopyRef = () => {
    if (!booking) return;
    navigator.clipboard.writeText(booking.referenceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: `url('/lovable-uploads/c3a59b6e-bd2c-4fea-a0a9-48bbf2bc4263.png')` }} />

      <div className="relative z-10 pt-8 px-6">
        <Link to="/">
          <Button variant="outline" className="bg-card/80 hover:bg-card border-border">
            <Home className="w-4 h-4 mr-2" />Back to Homepage
          </Button>
        </Link>
      </div>

      <div className="relative z-10 container mx-auto max-w-2xl px-6 py-8 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="flex items-center gap-1 text-primary font-medium">
            <CheckCircle2 className="w-4 h-4" /> Booking
          </span>
          <span className="w-8 h-px bg-border" />
          <span className={`flex items-center gap-1 font-medium ${paymentConfirmed ? 'text-primary' : 'text-muted-foreground'}`}>
            {paymentConfirmed ? <CheckCircle2 className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />} Payment
          </span>
          <span className="w-8 h-px bg-border" />
          <span className={`flex items-center gap-1 font-medium ${paymentConfirmed ? 'text-primary' : 'text-muted-foreground'}`}>
            {paymentConfirmed ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />} Gate Pass
          </span>
        </div>

        {/* Payment Section (shown if not yet confirmed) */}
        {!paymentConfirmed && (
          <Card className="bg-card/95 backdrop-blur-sm shadow-xl border-border overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 py-6 px-6 text-center">
              <CreditCard className="w-10 h-10 text-white mx-auto mb-2" />
              <h2 className="text-xl font-bold text-white">Complete Payment</h2>
              <p className="text-white/90 text-sm">Pay via M-Pesa to confirm your booking</p>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Business Number (Paybill)</span>
                  <span className="font-bold text-foreground text-lg">4185257</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Account Number</span>
                  <span className="font-bold text-foreground text-lg">POOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-primary text-lg">KES {booking.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Reference</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">{booking.referenceCode}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopyRef}>
                      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>How to pay:</strong> Go to M-Pesa → Lipa na M-Pesa → Pay Bill → Enter Business No: <strong>4185257</strong> → Account: <strong>POOL</strong> → Amount: <strong>KES {booking.amount.toLocaleString()}</strong>
                </p>
              </div>

              <Button onClick={handleConfirmPayment} disabled={confirmingPayment}
                className="w-full h-12 text-lg bg-green-600 hover:bg-green-700">
                {confirmingPayment ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Confirming Payment...</>
                ) : (
                  <><CheckCircle2 className="w-5 h-5 mr-2" />I Have Paid — Confirm Payment</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Booking Confirmed + Gate Pass */}
        <Card className="bg-card/95 backdrop-blur-sm shadow-xl border-border overflow-hidden">
          {paymentConfirmed ? (
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 py-8 px-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h1>
              <p className="text-white/90">Your swim session is confirmed and gate pass is ready</p>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 py-6 px-6 text-center">
              <h2 className="text-xl font-bold text-white">Booking Created — Awaiting Payment</h2>
              <p className="text-white/90 text-sm">Complete payment above to get your gate pass</p>
            </div>
          )}

          <CardHeader className="text-center pb-2">
            <CardDescription>Booking Reference</CardDescription>
            <CardTitle className="text-2xl font-mono tracking-wider text-primary">
              {booking.referenceCode}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Booking Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Guest Name</p>
                  <p className="font-medium text-foreground">{booking.firstName} {booking.lastName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</p>
                  <p className="font-medium text-foreground">{booking.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</p>
                  <p className="font-medium text-foreground">{booking.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</p>
                  <p className="font-medium text-foreground">
                    {new Date(booking.bookingDate).toLocaleDateString('en-US', {
                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Time</p>
                  <p className="font-medium text-foreground">{booking.timeSlot}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Guests</p>
                  <p className="font-medium text-foreground">{booking.numGuests}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3" /> Amount</p>
                  <p className="font-medium text-foreground">KES {booking.amount.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Payment Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${paymentConfirmed ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                    {paymentConfirmed ? '✅ Paid' : '⏳ Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Download Gate Pass - Only if payment confirmed */}
            {paymentConfirmed && (
              <Button onClick={handleDownloadPDF} disabled={isDownloading}
                className="w-full h-14 text-lg bg-primary hover:bg-primary/90" size="lg">
                {isDownloading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating Gate Pass...</>
                ) : (
                  <><Download className="w-5 h-5 mr-2" />Download Gate Pass (PDF)</>
                )}
              </Button>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Important Information</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Present your gate pass at the entrance</li>
                <li>• Arrive at least 10 minutes before your scheduled time</li>
                <li>• Bring appropriate swimwear and towels</li>
                {!paymentConfirmed && <li>• <strong>Complete payment to receive your gate pass</strong></li>}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/book-swim')}>
                <ArrowLeft className="w-4 h-4 mr-2" />Book Another Session
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>
                <Home className="w-4 h-4 mr-2" />Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingSuccess;
