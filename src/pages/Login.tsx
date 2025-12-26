import { useState, useEffect } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Alert from "../components/ui/Alert";
import { authService } from "../services/auth";
import { useAuthStore } from "../store/authStore";
import { cartService } from "../services/cart";
import { useUIStore } from "../store/uiStore";
import { useQueryClient } from "@tanstack/react-query";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { setAuth, isAuthenticated } = useAuthStore();
  const triggerCartUpdate = useUIStore((state) => state.triggerCartUpdate);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated (but not during login flow)
  useEffect(() => {
    if (isAuthenticated && !loading) {
      const returnUrl = searchParams.get("return") || location.state?.returnUrl;
      const destination =
        returnUrl || (location.state?.from === "cart" ? "/cart" : "/");
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, searchParams, location]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError("");
    setLoading(true);
    try {
      const response = await authService.login(data);
      if (response.success && response.token && response.user) {
        // Determine destination BEFORE setting auth to avoid route guard redirect
        const returnUrl =
          searchParams.get("return") || location.state?.returnUrl;
        const destination =
          returnUrl || (location.state?.from === "cart" ? "/cart" : "/");

        // Set auth state
        setAuth(response.user, response.token);

        // Navigate immediately to prevent route guard from redirecting to home
        navigate(destination, { replace: true });

        // Sync guest cart in the background (after navigation)
        const guestCart = cartService.getGuestCart();
        if (guestCart.length > 0) {
          try {
            await cartService.syncGuestCart();
            // Invalidate cart queries to refresh the UI
            queryClient.invalidateQueries({ queryKey: ["cart"] });
            triggerCartUpdate();
          } catch (syncError) {
            console.error("Error syncing guest cart:", syncError);
          }
        } else {
          // Even if no guest cart, invalidate to load user's cart
          queryClient.invalidateQueries({ queryKey: ["cart"] });
        }
      } else {
        setError(response.error || response.message || "Login failed");
      }
    } catch (err: unknown) {
      // Extract error message from axios error response
      let errorMessage = "Login failed. Please try again.";
      
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string; message?: string } } };
        errorMessage = axiosError.response?.data?.error || 
                      axiosError.response?.data?.message || 
                      errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <p className="text-sm font-medium">{error}</p>
              </Alert>
            )}

            <div>
              <Input type="email" placeholder="Email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Input
                type="password"
                placeholder="Password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
