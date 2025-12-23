import { useMemo } from "react";
import { useCart } from "./useCart";
import { useAuthStore } from "../store/authStore";
import { cartService } from "../services/cart";
import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "../store/uiStore";

export const useCartCount = () => {
  const { isAuthenticated } = useAuthStore();
  const { data: cartData } = useCart();
  const cartUpdated = useUIStore((state) => state.cartUpdated);

  // For authenticated users, get count from cart query
  const authenticatedCount = useMemo(() => {
    if (!isAuthenticated || !cartData?.cart?.items) return 0;
    return cartData.cart.items.reduce(
      (count: number, item: { quantity: number }) => count + item.quantity,
      0
    );
  }, [isAuthenticated, cartData?.cart?.items]);

  // For guest users, get count from localStorage
  const { data: guestCartCount } = useQuery({
    queryKey: ["guestCartCount", cartUpdated],
    queryFn: () => {
      if (isAuthenticated) return 0;
      const guestCart = cartService.getGuestCart();
      return guestCart.reduce((count, item) => count + item.quantity, 0);
    },
    enabled: !isAuthenticated,
    staleTime: 0,
  });

  return isAuthenticated ? authenticatedCount : guestCartCount || 0;
};
