import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cartService, type Cart } from "../services/cart";
import { type Product } from "../services/products";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";

export const useCart = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery<{ success: boolean; cart: Cart }>({
    queryKey: ["cart"],
    queryFn: () => cartService.getCart(),
    enabled: isAuthenticated,
    staleTime: 0, // Always fetch fresh cart data
    gcTime: 0, // Don't cache - always refetch
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
    notifyOnChangeProps: "all", // Notify on all property changes to ensure re-renders
    structuralSharing: false, // Disable structural sharing to ensure re-renders on cache updates
  });
};

export const useAddToCart = () => {
  const queryClient = useQueryClient();
  const incrementCartMutationVersion = useUIStore(
    (state) => state.incrementCartMutationVersion
  );

  return useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity?: number;
    }) => cartService.addToCart(productId, quantity || 1),
    onSuccess: async (data) => {
      // Increment mutation version to force UI updates
      incrementCartMutationVersion();
      // Set the query data directly from the API response (already has populated products)
      if (data) {
        queryClient.setQueryData(["cart"], data);
      }
      // Also invalidate to mark as stale and refetch
      queryClient.invalidateQueries({
        queryKey: ["cart"],
        refetchType: "active",
      });
    },
  });
};

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();
  const incrementCartMutationVersion = useUIStore(
    (state) => state.incrementCartMutationVersion
  );

  return useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => cartService.updateCartItem(productId, quantity),
    onSuccess: async (data) => {
      // Increment mutation version to force UI updates
      incrementCartMutationVersion();
      // Set the query data directly from the API response (already has populated products)
      if (data) {
        queryClient.setQueryData(["cart"], data);
      }
      // Also invalidate to mark as stale and refetch
      queryClient.invalidateQueries({
        queryKey: ["cart"],
        refetchType: "active",
      });
    },
  });
};

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();
  const incrementCartMutationVersion = useUIStore(
    (state) => state.incrementCartMutationVersion
  );

  return useMutation({
    mutationFn: (productId: string) => cartService.removeFromCart(productId),
    onSuccess: async (data) => {
      // Increment mutation version to force UI updates
      incrementCartMutationVersion();
      // Set the query data directly from the API response (already has populated products)
      if (data) {
        queryClient.setQueryData(["cart"], data);
      }
      // Also invalidate to mark as stale and refetch
      queryClient.invalidateQueries({
        queryKey: ["cart"],
        refetchType: "active",
      });
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
