import { create } from "zustand";
import { type Product, productService } from "../services/products";
import { cartService } from "../services/cart";
import { useAuthStore } from "./authStore";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  loadCart: () => Promise<void>;
  addItem: (product: Product, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  syncGuestCart: () => Promise<void>;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isLoading: false,

  loadCart: async () => {
    const { isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated) {
      // Load guest cart with product details
      set({ isLoading: true });
      try {
        const guestCart = cartService.getGuestCart();
        const items: CartItem[] = [];

        for (const guestItem of guestCart) {
          try {
            // Skip if productSlug is missing or empty
            if (!guestItem.productSlug || guestItem.productSlug.trim().length === 0) {
              console.warn('Guest cart item missing productSlug, skipping');
              continue;
            }
            // Fetch product by slug
            const product = await productService.getProduct(
              guestItem.productSlug
            );
            if (product.product) {
              items.push({
                product: product.product,
                quantity: guestItem.quantity,
              });
            }
          } catch (error) {
            console.error(
              `Error loading product ${guestItem.productSlug}:`,
              error
            );
          }
        }

        set({ items });
      } catch (error) {
        console.error("Error loading guest cart:", error);
        set({ items: [] });
      } finally {
        set({ isLoading: false });
      }
      return;
    }

    set({ isLoading: true });
    try {
      const response = await cartService.getCart();
      set({ items: response.cart.items || [] });
    } catch (error) {
      console.error("Error loading cart:", error);
      set({ items: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (product: Product, quantity = 1) => {
    const { isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated) {
      // Add to guest cart using slug or _id as fallback
      const productSlug = product.slug || product._id;
      cartService.addToGuestCart(productSlug, quantity);
      // Update local state
      const currentItems = get().items;
      const existingItem = currentItems.find(
        (item) => (item.product.slug || item.product._id) === productSlug
      );

      if (existingItem) {
        set({
          items: currentItems.map((item) =>
            (item.product.slug || item.product._id) === productSlug
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
        });
      } else {
        set({ items: [...currentItems, { product, quantity }] });
      }
      return;
    }

    set({ isLoading: true });
    try {
      await cartService.addToCart(product._id, quantity);
      await get().loadCart();
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateQuantity: async (productId: string, quantity: number) => {
    const { isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated) {
      const item = get().items.find((item) => item.product._id === productId);
      if (item) {
        const productSlug = item.product.slug || item.product._id;
        cartService.updateGuestCartItem(productSlug, quantity);
        set({
          items: get()
            .items.map((item) =>
              item.product._id === productId ? { ...item, quantity } : item
            )
            .filter((item) => item.quantity > 0),
        });
      }
      return;
    }

    set({ isLoading: true });
    try {
      await cartService.updateCartItem(productId, quantity);
      await get().loadCart();
    } catch (error) {
      console.error("Error updating cart:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (productId: string) => {
    const { isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated) {
      const item = get().items.find((item) => item.product._id === productId);
      if (item) {
        const productSlug = item.product.slug || item.product._id;
        cartService.removeFromGuestCart(productSlug);
        set({
          items: get().items.filter((item) => item.product._id !== productId),
        });
      }
      return;
    }

    set({ isLoading: true });
    try {
      await cartService.removeFromCart(productId);
      await get().loadCart();
    } catch (error) {
      console.error("Error removing from cart:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearCart: async () => {
    const { isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated) {
      cartService.clearGuestCart();
      set({ items: [] });
      return;
    }

    set({ isLoading: true });
    try {
      await cartService.clearCart();
      await get().loadCart();
    } catch (error) {
      console.error("Error clearing cart:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  syncGuestCart: async () => {
    set({ isLoading: true });
    try {
      await cartService.syncGuestCart();
      await get().loadCart();
    } catch (error) {
      console.error("Error syncing guest cart:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  getTotal: () => {
    return get().items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
}));
