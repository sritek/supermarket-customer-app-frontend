import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../ui/Card";
import { Minus, Plus, ShoppingCart, Trash } from "lucide-react";
import {
  useAddToCart,
  useUpdateCartItem,
  useRemoveFromCart,
  useCart,
} from "../../hooks/useCart";
import { useAuthStore } from "../../store/authStore";
import { cartService } from "../../services/cart";
import { useUIStore } from "../../store/uiStore";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Product } from "../../services/products";
import type { Cart, CartItem } from "../../services/cart";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { isAuthenticated } = useAuthStore();
  const triggerCartUpdate = useUIStore((state) => state.triggerCartUpdate);
  // Subscribe to cartUpdated to recalculate cartItem when guest cart changes
  const cartUpdated = useUIStore((state) => state.cartUpdated);
  // Subscribe to cartMutationVersion to recalculate cartItem when authenticated cart changes
  const cartMutationVersion = useUIStore((state) => state.cartMutationVersion);
  const addToCartMutation = useAddToCart();
  const updateCartItemMutation = useUpdateCartItem();
  const removeFromCartMutation = useRemoveFromCart();
  const { data: cartData } = useCart();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showCounter, setShowCounter] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<"up" | "down">(
    "up"
  );
  const [prevQuantity, setPrevQuantity] = useState(1);

  // Treat UNAVAILABLE status as out of stock for customer UI
  const isUnavailable = product.status === "UNAVAILABLE";
  const isOutOfStock = product.stockQuantity === 0 || isUnavailable;
  const maxQuantity = isUnavailable ? 0 : product.stockQuantity;

  // Check if product is in cart
  // Include cartUpdated and cartMutationVersion as dependencies so this recalculates when cart changes
  const cartItem = useMemo(() => {
    // Use cartUpdated and cartMutationVersion to force recalculation (prevents tree-shaking)
    if (cartUpdated < 0 || cartMutationVersion < 0) return null;

    if (isAuthenticated && cartData?.cart?.items) {
      return cartData.cart.items.find(
        (item) => item.product._id === product._id
      );
    } else if (!isAuthenticated) {
      const productSlug = product.slug || product._id;
      const guestCart = cartService.getGuestCart();
      return guestCart.find((item) => item.productSlug === productSlug);
    }
    return null;
  }, [
    isAuthenticated,
    cartData,
    product._id,
    product.slug,
    cartUpdated,
    cartMutationVersion,
  ]);

  // Initialize quantity from cart if item exists
  useEffect(() => {
    if (cartItem) {
      const cartQuantity = cartItem.quantity;
      setQuantity(cartQuantity);
      setPrevQuantity(cartQuantity);
      setShowCounter(true);
    } else {
      setQuantity(1);
      setPrevQuantity(1);
      setShowCounter(false);
    }
  }, [cartItem]);

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) {
      return;
    }
    if (newQuantity > maxQuantity) {
      toast.warning(
        `Only ${maxQuantity} item${
          maxQuantity > 1 ? "s" : ""
        } available in stock`
      );
      return;
    }

    // Determine animation direction
    const direction = newQuantity > quantity ? "up" : "down";
    setAnimationDirection(direction);
    setPrevQuantity(quantity);
    setIsAnimating(true);
    setQuantity(newQuantity);

    // Update cart if item is already in cart
    if (cartItem) {
      try {
        if (isAuthenticated) {
          await updateCartItemMutation.mutateAsync({
            productId: product._id,
            quantity: newQuantity,
          });
        } else {
          const productSlug = product.slug || product._id;
          cartService.updateGuestCartItem(productSlug, newQuantity);
          triggerCartUpdate();
        }
      } catch (error: unknown) {
        const errorMessage =
          (error as { response?: { data?: { error?: string } } })?.response
            ?.data?.error || "Failed to update cart";
        toast.error(errorMessage);
        // Revert quantity on error
        setQuantity(cartItem.quantity);
      }
    }

    setTimeout(() => setIsAnimating(false), 350);
  };

  const handleAddToCart = async () => {
    if (isOutOfStock) {
      toast.error("Product is out of stock");
      return;
    }

    if (quantity > maxQuantity) {
      toast.warning(
        `Only ${maxQuantity} item${
          maxQuantity > 1 ? "s" : ""
        } available in stock. Quantity adjusted.`
      );
      setQuantity(maxQuantity);
      return;
    }

    setIsAdding(true);
    try {
      if (isAuthenticated) {
        // Get current cart state directly from query client to ensure we have latest data
        const currentCartData = queryClient.getQueryData<{
          success: boolean;
          cart: Cart;
        }>(["cart"]);
        const existingCartItem = currentCartData?.cart?.items?.find(
          (item: CartItem) => {
            // Product can be populated (object) or just an ID (string) depending on API response
            const productId =
              typeof item.product === "object"
                ? item.product._id
                : item.product;
            return productId === product._id;
          }
        );

        // If item is already in cart, update quantity instead of adding
        if (existingCartItem) {
          const currentQuantity =
            typeof existingCartItem.quantity === "number"
              ? existingCartItem.quantity
              : 0;
          const newQuantity = currentQuantity + quantity;
          await updateCartItemMutation.mutateAsync({
            productId: product._id,
            quantity: newQuantity,
          });
        } else {
          await addToCartMutation.mutateAsync({
            productId: product._id,
            quantity,
          });
        }
      } else {
        // Use slug or fallback to _id for guest cart
        const productSlug = product.slug || product._id;
        cartService.addToGuestCart(productSlug, quantity);
        triggerCartUpdate();
      }
      // Show counter with smooth animation
      setShowCounter(true);
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to add to cart";

      if (
        errorMessage.toLowerCase().includes("stock") ||
        errorMessage.toLowerCase().includes("insufficient")
      ) {
        toast.warning(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFromCart = async () => {
    try {
      if (isAuthenticated) {
        await removeFromCartMutation.mutateAsync(product._id);
      } else {
        const productSlug = product.slug || product._id;
        cartService.removeFromGuestCart(productSlug);
        triggerCartUpdate();
      }
      setShowCounter(false);
      setQuantity(1);
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to remove from cart";
      toast.error(errorMessage);
    }
  };

  // Generate slug if missing (fallback to _id)
  const productSlug = product.slug || product._id;

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg border border-gray-200 bg-white">
      {/* Image Section */}
      <Link to={`/products/${productSlug}`} className="block relative">
        <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              No Image
            </div>
          )}

          {/* Stock Badges */}
          {isOutOfStock && (
            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-semibold shadow-sm">
              {isUnavailable ? "Unavailable" : "Out of Stock"}
            </div>
          )}
          {!isOutOfStock && product.stockQuantity < 10 && (
            <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded font-semibold shadow-sm">
              Only {product.stockQuantity} left
            </div>
          )}
        </div>
      </Link>

      {/* Content Section */}
      <CardContent className="p-4 space-y-3">
        {/* Product Name and Price */}
        <div className="space-y-1.5">
          <Link to={`/products/${productSlug}`}>
            <h3 className="font-medium text-sm leading-tight hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem] text-gray-900">
              {product.name}
            </h3>
          </Link>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-foreground">
              ₹{product.price}
            </span>
          </div>
        </div>

        {/* Add to Cart Button / Counter */}
        {!isOutOfStock && (
          <div className="relative h-9 overflow-hidden">
            {/* Add to Cart Button */}
            <div
              className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                showCounter
                  ? "opacity-0 translate-x-full pointer-events-none"
                  : "opacity-100 translate-x-0"
              }`}
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleAddToCart();
                }}
                disabled={isAdding}
                className="w-full h-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-md text-xs font-medium hover:bg-primary/90 active:bg-primary/95 transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? (
                  <span>Adding...</span>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
            </div>

            {/* Counter with Plus/Minus */}
            <div
              className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                showCounter
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-full pointer-events-none"
              }`}
            >
              <div className="flex items-center justify-between border border-gray-300 rounded-md overflow-hidden bg-white h-full">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (quantity <= 1) {
                      // Remove from cart if quantity becomes 0
                      handleRemoveFromCart();
                    } else {
                      handleQuantityChange(quantity - 1);
                    }
                  }}
                  disabled={isAdding}
                  className="p-2 hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Decrease quantity"
                >
                  {quantity > 1 ? (
                    <Minus className="h-4 w-4 text-gray-700" />
                  ) : (
                    <Trash className="h-4 w-4 text-gray-700" />
                  )}
                </button>
                <div className="relative px-3 py-1.5 min-w-[2.5rem] h-full flex items-center justify-center overflow-hidden">
                  {/* Previous number sliding out */}
                  {isAnimating && (
                    <span
                      className={`absolute text-sm font-semibold text-gray-900 transition-all duration-300 ease-out ${
                        animationDirection === "up"
                          ? "animate-slide-out-up"
                          : "animate-slide-out-down"
                      }`}
                    >
                      {prevQuantity}
                    </span>
                  )}
                  {/* New number sliding in */}
                  <span
                    key={quantity}
                    className={`absolute text-sm font-semibold text-gray-900 transition-all duration-300 ease-out ${
                      isAnimating
                        ? animationDirection === "up"
                          ? "animate-slide-up"
                          : "animate-slide-down"
                        : ""
                    }`}
                    onAnimationEnd={() => setIsAnimating(false)}
                  >
                    {quantity}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleQuantityChange(quantity + 1);
                  }}
                  disabled={quantity >= maxQuantity || isAdding}
                  className="p-2 hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4 text-gray-700" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Out of Stock Message */}
        {isOutOfStock && (
          <div className="text-center py-1.5">
            <p className="text-xs text-red-600 font-medium">
              Currently unavailable
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductCard;
