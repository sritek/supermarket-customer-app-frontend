import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { AlertCircle } from "lucide-react";
import { useCart, useClearCart } from "../hooks/useCart";
import { useValidateCartItems } from "../hooks/useCartValidation";
import {
  useCreateOrder,
  useAddresses,
  useAddAddress,
  useCreateRazorpayOrder,
  useVerifyRazorpayPayment,
} from "../hooks/useOrders";
import { openRazorpayCheckout } from "../utils/razorpay";
import { useAuthStore } from "../store/authStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { Product } from "../services/products";

const addressSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(6, "Valid pincode is required"),
  isDefault: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

const Checkout = () => {
  const navigate = useNavigate();
  const { data: cartData } = useCart();
  const { user } = useAuthStore();
  const createOrderMutation = useCreateOrder();
  const clearCartMutation = useClearCart();
  const { data: addressesData } = useAddresses();
  const addAddressMutation = useAddAddress();
  const createRazorpayOrderMutation = useCreateRazorpayOrder();
  const verifyRazorpayPaymentMutation = useVerifyRazorpayPayment();

  const items = cartData?.cart?.items || [];
  const addresses = useMemo(
    () => addressesData?.addresses || [],
    [addressesData?.addresses]
  );

  // Validate stock before checkout
  const { data: validations, isLoading: validatingStock } =
    useValidateCartItems(
      items.map((item: { product: Product; quantity: number }) => ({
        product: item.product,
        quantity: item.quantity,
      }))
    );

  // Compute default address
  const defaultAddress = useMemo(() => {
    return addresses.find((addr) => addr.isDefault) || addresses[0];
  }, [addresses]);

  // Initialize with default address
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    defaultAddress?._id || ""
  );

  // Update selected address if current selection is invalid
  const currentAddress = addresses.find((a) => a._id === selectedAddressId);
  if (
    !currentAddress &&
    defaultAddress &&
    selectedAddressId !== defaultAddress._id
  ) {
    setSelectedAddressId(defaultAddress._id);
  }
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("cod");
  const [showAddressForm, setShowAddressForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
  });

  const onSubmitAddress = async (data: AddressFormData) => {
    try {
      const response = await addAddressMutation.mutateAsync(data);
      setSelectedAddressId(response.address._id);
      setShowAddressForm(false);
      reset();
    } catch (error) {
      console.error("Error adding address:", error);
    }
  };

  const getTotal = () => {
    return items.reduce(
      (total: number, item: { product: Product; quantity: number }) => {
        return total + item.product.price * item.quantity;
      },
      0
    );
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Please select or add an address");
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Check for stock issues before placing order
    const hasStockIssues = validations?.some(
      (v) => v.isOutOfStock || v.isInsufficientStock
    );

    if (hasStockIssues) {
      toast.error(
        "Some items in your cart have stock issues. Please go back to cart and update quantities."
      );
      navigate("/cart");
      return;
    }

    try {
      if (paymentMethod === "razorpay") {
        // Calculate total amount
        const total = getTotal() * 1.18 + (getTotal() >= 500 ? 0 : 50);

        // Create Razorpay order
        const razorpayOrderResponse =
          await createRazorpayOrderMutation.mutateAsync(total);

        // Get Razorpay key from environment
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!razorpayKey) {
          toast.error("Razorpay key not configured. Please contact support.");
          return;
        }

        // Open Razorpay checkout
        try {
          const paymentResponse = await openRazorpayCheckout({
            key: razorpayKey,
            amount: razorpayOrderResponse.amount, // Already in paise
            currency: razorpayOrderResponse.currency || "INR",
            name: "Supermarket E-Com",
            description: `Order payment for ${items.length} item(s)`,
            order_id: razorpayOrderResponse.orderId,
            prefill: {
              name: user?.name || "",
              email: user?.email || "",
              contact:
                addresses.find((a) => a._id === selectedAddressId)?.phone || "",
            },
            theme: {
              color: "#2563eb",
            },
          });

          // Verify payment
          await verifyRazorpayPaymentMutation.mutateAsync({
            razorpayOrderId: paymentResponse.razorpay_order_id,
            razorpayPaymentId: paymentResponse.razorpay_payment_id,
            razorpaySignature: paymentResponse.razorpay_signature,
          });

          // Create order with Razorpay payment details
          const orderResponse = await createOrderMutation.mutateAsync({
            addressId: selectedAddressId,
            paymentMethod: "razorpay",
            razorpayOrderId: paymentResponse.razorpay_order_id,
            razorpayPaymentId: paymentResponse.razorpay_payment_id,
          });

          // Clear cart
          await clearCartMutation.mutateAsync();

          toast.success("Order placed successfully!");
          navigate(`/orders/${orderResponse.order._id}`);
        } catch (paymentError: unknown) {
          console.error("Payment error:", paymentError);
          const errorMessage =
            paymentError instanceof Error
              ? paymentError.message
              : "Payment failed. Please try again.";
          if (errorMessage === "Payment cancelled by user") {
            toast.info("Payment was cancelled");
          } else {
            toast.error(errorMessage);
          }
        }
      } else {
        // Cash on Delivery
        const orderResponse = await createOrderMutation.mutateAsync({
          addressId: selectedAddressId,
          paymentMethod: "cod",
        });

        // Clear cart
        await clearCartMutation.mutateAsync();

        toast.success("Order placed successfully!");
        navigate(`/orders/${orderResponse.order._id}`);
      }
    } catch (error: unknown) {
      console.error("Error placing order:", error);
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ||
        (error as Error)?.message ||
        "Failed to place order. Please try again.";
      toast.error(errorMessage);
    }
  };

  const TAX_RATE = 0.18;
  const DELIVERY_FEE = getTotal() >= 500 ? 0 : 50;
  const subtotal = getTotal();
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax + DELIVERY_FEE;

  // Check for stock issues
  const hasStockIssues = validations?.some(
    (v) => v.isOutOfStock || v.isInsufficientStock
  );

  const loading = createOrderMutation.isPending || validatingStock;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {hasStockIssues && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 mb-1">
                Stock Issues Detected
              </h3>
              <p className="text-sm text-red-700 mb-2">
                Some items in your cart have stock issues. Please go back to
                cart and update quantities before proceeding.
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                {validations
                  ?.filter((v) => v.isOutOfStock || v.isInsufficientStock)
                  .map((v, idx) => (
                    <li key={v.productId || idx}>
                      {v.isOutOfStock
                        ? `Product is out of stock`
                        : `Only ${v.availableStock} available (requested: ${v.requestedQuantity})`}
                    </li>
                  ))}
              </ul>
              <Link to="/cart">
                <Button variant="outline" className="mt-3" size="sm">
                  Go Back to Cart
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Address Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {addresses.map((address) => (
                <label
                  key={address._id}
                  className={`block p-4 border rounded-md cursor-pointer hover:bg-muted transition-colors ${
                    selectedAddressId === address._id
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={address._id}
                    checked={selectedAddressId === address._id}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium">{address.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {address.phone}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.addressLine1}
                      {address.addressLine2 && `, ${address.addressLine2}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}, {address.state} - {address.pincode}
                    </p>
                  </div>
                </label>
              ))}

              {showAddressForm ? (
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <form
                      onSubmit={handleSubmit(onSubmitAddress)}
                      className="space-y-4"
                    >
                      <div>
                        <Input placeholder="Name" {...register("name")} />
                        {errors.name && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Input placeholder="Phone" {...register("phone")} />
                        {errors.phone && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.phone.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Input
                          placeholder="Address Line 1"
                          {...register("addressLine1")}
                        />
                        {errors.addressLine1 && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.addressLine1.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Input
                          placeholder="Address Line 2 (Optional)"
                          {...register("addressLine2")}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Input placeholder="City" {...register("city")} />
                          {errors.city && (
                            <p className="text-sm text-destructive mt-1">
                              {errors.city.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Input placeholder="State" {...register("state")} />
                          {errors.state && (
                            <p className="text-sm text-destructive mt-1">
                              {errors.state.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Input placeholder="Pincode" {...register("pincode")} />
                        {errors.pincode && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.pincode.message}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit">Save Address</Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowAddressForm(false);
                            reset();
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowAddressForm(true)}
                >
                  Add New Address
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-muted transition-colors">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                  className="mr-3"
                />
                <div>
                  <p className="font-medium">Cash on Delivery</p>
                  <p className="text-sm text-muted-foreground">
                    Pay when you receive
                  </p>
                </div>
              </label>
              <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-muted transition-colors">
                <input
                  type="radio"
                  name="payment"
                  value="razorpay"
                  checked={paymentMethod === "razorpay"}
                  onChange={() => setPaymentMethod("razorpay")}
                  className="mr-3"
                />
                <div>
                  <p className="font-medium">Razorpay (Test Mode)</p>
                  <p className="text-sm text-muted-foreground">
                    Pay online securely
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="md:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (18%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee</span>
                  <span>
                    {DELIVERY_FEE === 0 ? "Free" : `₹${DELIVERY_FEE}`}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handlePlaceOrder}
                disabled={
                  loading ||
                  !selectedAddressId ||
                  items.length === 0 ||
                  hasStockIssues
                }
              >
                {loading
                  ? "Placing Order..."
                  : hasStockIssues
                  ? "Fix Stock Issues First"
                  : "Place Order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
