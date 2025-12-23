import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Minus, Plus, Trash2, ShoppingBag, AlertCircle } from "lucide-react";
import {
  useCart,
  useUpdateCartItem,
  useRemoveFromCart,
} from "../hooks/useCart";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useValidateCartItems } from "../hooks/useCartValidation";
import { cartService } from "../services/cart";
import { productService } from "../services/products";
import { toast } from "sonner";
import type { Product } from "../services/products";

const Cart = () => {
  const { isAuthenticated } = useAuthStore();
  const triggerCartUpdate = useUIStore((state) => state.triggerCartUpdate);
  const {
    data: cartData,
    isLoading: cartLoading,
    isFetching: cartFetching,
    error: cartError,
  } = useCart();
  const updateQuantityMutation = useUpdateCartItem();
  const removeItemMutation = useRemoveFromCart();

  // Track which items are being updated
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  // Get cart items
  const items = cartData?.cart?.items || [];

  // Validate stock for all items (only when cart is loaded and has items)
  const { data: validations } = useValidateCartItems(
    items.map((item: { product: Product; quantity: number }) => ({
      product: item.product,
      quantity: item.quantity,
    }))
  );

  // For guest cart
  const [guestItems, setGuestItems] = useState<
    Array<{ product: Product; quantity: number }>
  >([]);
  const [loadingGuestCart, setLoadingGuestCart] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      loadGuestCart();
    }
  }, [isAuthenticated]);

  const loadGuestCart = async () => {
    setLoadingGuestCart(true);
    try {
      const guestCart = cartService.getGuestCart();
      const itemsWithProducts: Array<{ product: Product; quantity: number }> =
        [];

      for (const item of guestCart) {
        try {
          // Skip if productSlug is missing or empty
          if (!item.productSlug || item.productSlug.trim().length === 0) {
            console.warn("Guest cart item missing productSlug, skipping");
            continue;
          }
          const productData = await productService.getProduct(item.productSlug);
          itemsWithProducts.push({
            product: productData.product,
            quantity: item.quantity,
          });
        } catch (error) {
          console.error(`Error loading product ${item.productSlug}:`, error);
        }
      }

      setGuestItems(itemsWithProducts);
    } catch (error) {
      console.error("Error loading guest cart:", error);
    } finally {
      setLoadingGuestCart(false);
    }
  };

  // Validate guest cart items
  const { data: guestValidations } = useValidateCartItems(guestItems);

  const displayItems = isAuthenticated ? items : guestItems;
  const displayValidations = isAuthenticated ? validations : guestValidations;

  // Only show full page loading skeleton on initial load (no data yet)
  // isFetching is true during refetches, but we already have data so don't show full skeleton
  const isLoading = isAuthenticated
    ? cartLoading && !cartData && !cartError // Only show loading if we don't have cart data yet and no error
    : loadingGuestCart && guestItems.length === 0; // Only show loading if no guest items loaded yet

  const handleUpdateQuantity = async (
    productId: string,
    productSlug: string,
    _currentQuantity: number,
    newQuantity: number
  ) => {
    if (newQuantity <= 0) {
      // Remove item if quantity goes to 0 or below
      handleRemoveItem(productId, productSlug);
      return;
    }

    // Mark item as updating
    setUpdatingItems((prev) => new Set(prev).add(productId));

    if (isAuthenticated) {
      try {
        await updateQuantityMutation.mutateAsync({
          productId,
          quantity: newQuantity,
        });
        triggerCartUpdate();
      } catch (error: unknown) {
        const errorMessage =
          (error as { response?: { data?: { error?: string } } })?.response
            ?.data?.error || "Failed to update quantity";
        toast.error(errorMessage);
      } finally {
        setUpdatingItems((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    } else {
      cartService.updateGuestCartItem(productSlug, newQuantity);
      await loadGuestCart();
      triggerCartUpdate();
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleRemoveItem = async (productId: string, productSlug: string) => {
    // Mark item as updating
    setUpdatingItems((prev) => new Set(prev).add(productId));

    if (isAuthenticated) {
      try {
        await removeItemMutation.mutateAsync(productId);
        triggerCartUpdate();
      } catch (error: unknown) {
        const errorMessage =
          (error as { response?: { data?: { error?: string } } })?.response
            ?.data?.error || "Failed to remove item";
        toast.error(errorMessage);
        setUpdatingItems((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    } else {
      cartService.removeFromGuestCart(productSlug);
      await loadGuestCart();
      triggerCartUpdate();
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const getTotal = () => {
    return displayItems.reduce(
      (total: number, item: { product: Product; quantity: number }) => {
        return total + item.product.price * item.quantity;
      },
      0
    );
  };

  const TAX_RATE = 0.18;
  const DELIVERY_FEE = getTotal() >= 500 ? 0 : 50;
  const subtotal = getTotal();
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax + DELIVERY_FEE;

  // Check for stock issues
  const hasStockIssues = displayValidations?.some(
    (v) => v.isOutOfStock || v.isInsufficientStock
  );

  // Show error if cart failed to load
  if (isAuthenticated && cartError && !cartData) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Error loading cart</h2>
          <p className="text-muted-foreground mb-6">
            {cartError instanceof Error
              ? cartError.message
              : "Failed to load cart. Please try again."}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">
            Add some products to get started
          </p>
          <Link to="/products">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {hasStockIssues && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 mb-1">
                Stock Update
              </h3>
              <p className="text-sm text-yellow-700">
                Some items in your cart have stock issues. Please review and
                update quantities.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="md:col-span-2 space-y-4">
          {displayItems.map((item: { product: Product; quantity: number }) => {
            const productSlug = item.product.slug || item.product._id;
            const validation = displayValidations?.find(
              (v) =>
                v.productId === item.product._id ||
                v.productSlug === productSlug
            );
            const isOutOfStock =
              validation?.isOutOfStock || item.product.stockQuantity === 0;
            const isInsufficientStock =
              validation?.isInsufficientStock || false;
            const availableStock =
              validation?.availableStock ?? item.product.stockQuantity;
            const isUpdating = updatingItems.has(item.product._id);

            // Show skeleton for this item if it's being updated
            if (isUpdating) {
              return (
                <Card key={item.product._id} className="opacity-60">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-muted rounded-md animate-pulse flex-shrink-0"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-muted rounded animate-pulse w-3/4"></div>
                        <div className="h-4 bg-muted rounded animate-pulse w-1/4"></div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="h-10 bg-muted rounded animate-pulse w-32"></div>
                          <div className="h-6 bg-muted rounded animate-pulse w-20"></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card
                key={item.product._id}
                className={isOutOfStock ? "border-red-200 bg-red-50" : ""}
              >
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Link to={`/products/${productSlug}`}>
                      <div className="w-24 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0">
                        {item.product.images?.[0] ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="flex-1">
                      <Link to={`/products/${productSlug}`}>
                        <h3 className="font-medium hover:text-primary transition-colors">
                          {item.product.name}
                        </h3>
                      </Link>
                      <p className="text-muted-foreground text-sm mt-1">
                        ₹{item.product.price} each
                      </p>

                      {(isOutOfStock || isInsufficientStock) && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm">
                          {isOutOfStock ? (
                            <p className="text-red-800 font-medium">
                              Out of Stock
                            </p>
                          ) : (
                            <p className="text-red-800">
                              Only {availableStock} available (requested:{" "}
                              {item.quantity})
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2 border rounded-md">
                          <button
                            onClick={() =>
                              handleUpdateQuantity(
                                item.product._id,
                                productSlug,
                                item.quantity,
                                item.quantity - 1
                              )
                            }
                            disabled={isUpdating || cartFetching}
                            className="p-2 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="px-4 py-2 min-w-[60px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              handleUpdateQuantity(
                                item.product._id,
                                productSlug,
                                item.quantity,
                                item.quantity + 1
                              )
                            }
                            disabled={
                              item.quantity >= availableStock ||
                              isUpdating ||
                              cartFetching
                            }
                            className="p-2 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-semibold">
                            ₹{item.product.price * item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              handleRemoveItem(item.product._id, productSlug)
                            }
                            disabled={isUpdating || cartFetching}
                            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="md:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

              {/* Show subtle loading indicator in summary if cart is fetching */}
              {cartFetching && isAuthenticated && (
                <div className="mb-4 text-xs text-muted-foreground animate-pulse">
                  Updating...
                </div>
              )}

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
                {getTotal() < 500 && (
                  <p className="text-xs text-muted-foreground">
                    Add ₹{(500 - getTotal()).toFixed(2)} more for free delivery
                  </p>
                )}
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              {isAuthenticated ? (
                <Link to="/checkout" className="block">
                  <Button className="w-full" disabled={hasStockIssues}>
                    {hasStockIssues
                      ? "Fix Stock Issues First"
                      : "Proceed to Checkout"}
                  </Button>
                </Link>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    Please login to checkout
                  </p>
                  <Link
                    to="/login"
                    state={{ from: "cart", returnUrl: "/cart" }}
                    className="block"
                  >
                    <Button className="w-full">Login to Checkout</Button>
                  </Link>
                </div>
              )}

              <Link to="/products" className="block mt-4">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Cart;
