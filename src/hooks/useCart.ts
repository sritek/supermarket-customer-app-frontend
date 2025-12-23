import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cartService, type Cart } from "../services/cart";
import { type Product } from "../services/products";
import { useAuthStore } from "../store/authStore";

export const useCart = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery<{ success: boolean; cart: Cart }>({
    queryKey: ["cart"],
    queryFn: () => cartService.getCart(),
    enabled: isAuthenticated,
    staleTime: 0, // Always fetch fresh cart data
  });
};

export const useAddToCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity?: number;
    }) => cartService.addToCart(productId, quantity || 1),
    onSuccess: (data) => {
      // Update the cache with the new cart data immediately
      if (data?.cart) {
        queryClient.setQueryData(["cart"], data);
      }
      // Also invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.refetchQueries({ queryKey: ["cart"] });
    },
  });
};

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => cartService.updateCartItem(productId, quantity),
    onSuccess: (data) => {
      // Update the cache with the new cart data immediately
      if (data?.cart) {
        queryClient.setQueryData(["cart"], data);
      }
      // Also invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.refetchQueries({ queryKey: ["cart"] });
    },
  });
};

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => cartService.removeFromCart(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.refetchQueries({ queryKey: ["cart"] });
    },
  });
};

export const useClearCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};

// Guest cart helpers (localStorage)
export const useGuestCart = () => {
  const { isAuthenticated } = useAuthStore();

  // Return guest cart items from localStorage
  const getGuestCart = () => {
    if (isAuthenticated) return [];
    return cartService.getGuestCart();
  };

  return {
    items: getGuestCart(),
    addItem: (product: Product, quantity: number = 1) => {
      if (!isAuthenticated) {
        // Use slug or fallback to _id for guest cart
        const productSlug = product.slug || product._id;
        cartService.addToGuestCart(productSlug, quantity);
      }
    },
    updateQuantity: (productSlug: string, quantity: number) => {
      if (!isAuthenticated) {
        cartService.updateGuestCartItem(productSlug, quantity);
      }
    },
    removeItem: (productSlug: string) => {
      if (!isAuthenticated) {
        cartService.removeFromGuestCart(productSlug);
      }
    },
    clearCart: () => {
      if (!isAuthenticated) {
        cartService.clearGuestCart();
      }
    },
  };
};
