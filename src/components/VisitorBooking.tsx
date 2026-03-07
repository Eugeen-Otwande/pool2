import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, Loader2, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateBookingReference } from '@/utils/generateGatePassPDF';

const PRICE_PER_GUEST = 400;

const VisitorBooking = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    time: '',
    num_guests: 1,
    special_requests: ''
  });
  const [date, setDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        setUserProfile(profile);
        if (profile) {
          setFormData(prev => ({
            ...prev,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            email: profile.email || '',
            phone: profile.phone || ''
          }));
        }
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  const totalAmount = formData.num_guests * PRICE_PER_GUEST;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) { toast.error('Please select a date'); return; }
    if (!formData.time) { toast.error('Please select a time'); return; }
    if (!formData.first_name || !formData.last_name) { toast.error('Please enter your full name'); return; }
    if (!formData.email) { toast.error('Please enter your email'); return; }
    if (!formData.phone) { toast.error('Please enter your phone number'); return; }

    setIsLoading(true);
    try {
      const tempId = crypto.randomUUID();
      const referenceCode = generateBookingReference(tempId);
      const bookingDate = date.toISOString().split('T')[0];

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert([{
          user_id: user?.id || null,
          reference_code: referenceCode,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          booking_date: bookingDate,
          time_slot: formData.time,
          num_guests: formData.num_guests,
          special_requests: formData.special_requests || null,
          status: 'pending_payment',
          payment_status: 'pending',
          amount: totalAmount
        }])
        .select()
        .single();

      if (error) throw error;

      // Also insert into visitors table for backward compatibility
      await supabase.from('visitors').insert([{
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        date_of_visit: bookingDate,
        time_of_visit: formData.time,
        num_guests: formData.num_guests,
        payment_status: 'Pending',
        check_in_status: 'Not Checked In'
      }]);

      navigate('/booking-success', {
        state: {
          bookingId: booking.id,
          referenceCode: booking.reference_code,
          firstName: formData.first_name,
          lastName: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          bookingDate: bookingDate,
          timeSlot: formData.time,
          numGuests: formData.num_guests,
          amount: totalAmount,
          status: booking.status,
          paymentStatus: booking.payment_status
        }
      });
    } catch (error: any) {
      console.error('Error submitting booking:', error);
      if (error?.code === '23505') {
        toast.error('A booking with this reference already exists. Please try again.');
      } else {
        toast.error('Error submitting booking. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
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
        <Link to="/"><Button variant="outline" className="bg-card/80 hover:bg-card border-border"><ArrowLeft className="w-4 h-4 mr-2" />Back to Homepage</Button></Link>
      </div>

      <div className="relative z-10 container mx-auto max-w-2xl px-6 py-8">
        <Card className="bg-card/90 backdrop-blur-sm shadow-xl border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-foreground">Book Your Swim Session</CardTitle>
            <CardDescription className="text-muted-foreground">
              Fill out the form below to reserve your spot at RCMRD Pool
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required placeholder="Enter your first name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input id="last_name" value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required placeholder="Enter your last name" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required placeholder="your@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" type="tel" value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required placeholder="+254 700 000 000" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={date} onSelect={setDate}
                        disabled={(date) => date < new Date()} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Preferred Time *</Label>
                  <Select value={formData.time} onValueChange={(value) => setFormData({ ...formData, time: value })}>
                    <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guests">Number of Guests</Label>
                <Select value={formData.num_guests.toString()}
                  onValueChange={(value) => setFormData({ ...formData, num_guests: parseInt(value) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requests">Special Requests (Optional)</Label>
                <Textarea id="requests" value={formData.special_requests}
                  onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                  placeholder="Any special requirements or requests..." />
              </div>

              {/* Payment Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 border border-border">
                <h3 className="font-semibold text-foreground">Payment Summary</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{formData.num_guests} guest(s) × KES {PRICE_PER_GUEST}</span>
                  <span className="font-medium text-foreground">KES {totalAmount.toLocaleString()}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">KES {totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Submitting Booking...</>
                ) : (
                  'Book Now — Proceed to Payment'
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By booking, you agree to our pool rules and regulations.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VisitorBooking;
