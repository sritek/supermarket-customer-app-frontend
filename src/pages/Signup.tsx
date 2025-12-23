import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/authStore';
import { cartService } from '../services/cart';
import { useUIStore } from '../store/uiStore';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
});

type SignupFormData = z.infer<typeof signupSchema>;

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { setAuth, isAuthenticated } = useAuthStore();
  const triggerCartUpdate = useUIStore((state) => state.triggerCartUpdate);
  const [step, setStep] = useState<'signup' | 'otp'>('signup');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [testOtp, setTestOtp] = useState<string>(''); // Store OTP from backend
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated (but not during signup flow)
  useEffect(() => {
    if (isAuthenticated && !loading && step === 'signup') {
      const returnUrl = location.state?.returnUrl;
      const destination = returnUrl || (location.state?.from === 'cart' ? '/cart' : '/');
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, loading, step, navigate, location]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmitSignup = async (data: SignupFormData) => {
    setError('');
    setLoading(true);
    try {
      const response = await authService.signup(data);
      if (response.success) {
        setEmail(data.email);
        setTestOtp(response.otp || ''); // Store OTP from response
        setStep('otp');
      } else {
        setError(response.error || 'Signup failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitOTP = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await authService.verifyOTP(email, otp);
      if (response.success && response.token && response.user) {
        // Determine destination BEFORE setting auth to avoid route guard redirect
        const returnUrl = location.state?.returnUrl;
        const destination = returnUrl || (location.state?.from === 'cart' ? '/cart' : '/');
        
        // Set auth state after successful OTP verification
        setAuth(response.user, response.token);
        
        // Navigate immediately to prevent route guard from redirecting to home
        navigate(destination, { replace: true });
        
        // Sync guest cart in the background (after navigation)
        const guestCart = cartService.getGuestCart();
        if (guestCart.length > 0) {
          try {
            await cartService.syncGuestCart();
            // Invalidate cart queries to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            triggerCartUpdate();
            toast.success('Cart items synced successfully');
          } catch (syncError) {
            console.error('Error syncing guest cart:', syncError);
            toast.warning('Some cart items could not be synced');
          }
        } else {
          // Even if no guest cart, invalidate to load user's cart
          queryClient.invalidateQueries({ queryKey: ['cart'] });
        }
      } else {
        setError(response.error || 'Invalid OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await authService.resendOTP(email);
      if (response.success) {
        setTestOtp(response.otp || ''); // Update OTP from response
      } else {
        setError('Failed to resend OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Verify OTP</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); onSubmitOTP(); }} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  {error}
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Enter the OTP sent to {email}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="flex-1"
                  />
                  {testOtp && (
                    <div className="flex-shrink-0 px-3 py-2 bg-muted border border-border rounded-md">
                      <span className="text-sm font-mono font-semibold text-primary">
                        {testOtp}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        (Test OTP)
                      </span>
                    </div>
                  )}
                </div>
                {testOtp && (
                  <p className="text-xs text-muted-foreground mt-2">
                    This is a test OTP for development purposes
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendOTP}
              >
                Resend OTP
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitSignup)} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}

            <div>
              <Input placeholder="Name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Input type="email" placeholder="Email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Input type="tel" placeholder="Phone (Optional)" {...register('phone')} />
            </div>

            <div>
              <Input type="password" placeholder="Password" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;

