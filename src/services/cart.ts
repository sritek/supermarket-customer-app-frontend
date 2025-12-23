import api from "./api";
import { productService, type Product } from "./products";

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
}

export interface GuestCartItem {
  productSlug: string;
  quantity: number;
}

const GUEST_CART_KEY = "guest_cart";

export const cartService = {
  // Guest cart (localStorage)
  getGuestCart: (): GuestCartItem[] => {
    const cart = localStorage.getItem(GUEST_CART_KEY);
    return cart ? JSON.parse(cart) : [];
  },

  addToGuestCart: (productSlug: string, quantity: number = 1): void => {
    const cart = cartService.getGuestCart();
    const existingItem = cart.find((item) => item.productSlug === productSlug);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ productSlug, quantity });
    }

    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
  },

  updateGuestCartItem: (productSlug: string, quantity: number): void => {
    const cart = cartService.getGuestCart();
    const item = cart.find((item) => item.productSlug === productSlug);

    if (item) {
      if (quantity <= 0) {
        cartService.removeFromGuestCart(productSlug);
      } else {
        item.quantity = quantity;
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
      }
    }
  },

  removeFromGuestCart: (productSlug: string): void => {
    const cart = cartService.getGuestCart();
    const filtered = cart.filter((item) => item.productSlug !== productSlug);
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(filtered));
  },

  clearGuestCart: (): void => {
    localStorage.removeItem(GUEST_CART_KEY);
  },

  // User cart (API)
  getCart: async (): Promise<{ success: boolean; cart: Cart }> => {
    const response = await api.get("/cart");
    return response.data;
  },

  addToCart: async (
    productId: string,
    quantity: number = 1
  ): Promise<{ success: boolean; cart: Cart }> => {
    const response = await api.post("/cart", { productId, quantity });
    return response.data;
  },

  updateCartItem: async (
    productId: string,
    quantity: number
  ): Promise<{ success: boolean; cart: Cart }> => {
    const response = await api.put(`/cart/${productId}`, { quantity });
    return response.data;
  },

  removeFromCart: async (
    productId: string
  ): Promise<{ success: boolean; cart: Cart }> => {
    const response = await api.delete(`/cart/${productId}`);
    return response.data;
  },

  clearCart: async (): Promise<{ success: boolean }> => {
    const response = await api.delete("/cart");
    return response.data;
  },

  syncGuestCart: async (): Promise<{ success: boolean; cart: Cart }> => {
    const guestCart = cartService.getGuestCart();
    // Convert slugs to productIds for sync - we'll need to fetch products first
    // For now, we'll send the slugs and let backend handle it
    // But backend expects productId, so we need to fetch products first
    const items = [];
    for (const item of guestCart) {
      try {
        // Skip if productSlug is missing or empty
        if (!item.productSlug || item.productSlug.trim().length === 0) {
          console.warn("Guest cart item missing productSlug, skipping");
          continue;
        }
        const product = await productService.getProduct(item.productSlug);
        items.push({ productId: product.product._id, quantity: item.quantity });
      } catch (error) {
        console.error(`Error fetching product ${item.productSlug}:`, error);
      }
    }
    const response = await api.post("/cart/sync", { items });
    cartService.clearGuestCart();
    return response.data;
  },
};
