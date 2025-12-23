import { useQuery } from "@tanstack/react-query";
import { productService } from "../services/products";
import type { Product } from "../services/products";

export interface CartItemValidation {
  productId: string;
  productSlug: string;
  requestedQuantity: number;
  availableStock: number;
  isOutOfStock: boolean;
  isInsufficientStock: boolean;
}

export const useValidateCartItems = (
  items: Array<{ product: Product; quantity: number }>
) => {
  return useQuery({
    queryKey: ["validateCart", items.map((i) => ({ id: i.product._id, qty: i.quantity }))],
    queryFn: async () => {
      const validations: CartItemValidation[] = [];

      for (const item of items) {
        try {
          // Skip validation if product is missing required fields
          if (!item.product || !item.product._id) {
            console.warn('Product missing _id, skipping validation');
            continue;
          }

          // Admin DB products may not have slug, so use product data from cart
          // We already have the latest product data from the cart response
          const currentProduct = item.product;
          const availableStock = currentProduct.stockQuantity || currentProduct.stock || 0;

          validations.push({
            productId: currentProduct._id,
            productSlug: currentProduct.slug || currentProduct.sku || currentProduct._id,
            requestedQuantity: item.quantity,
            availableStock: availableStock,
            isOutOfStock: availableStock === 0,
            isInsufficientStock: item.quantity > availableStock,
          });
        } catch (error) {
          console.error(`Error validating product ${item.product?._id || 'unknown'}:`, error);
          // If validation fails, use data from cart item
          const currentProduct = item.product;
          const availableStock = currentProduct?.stockQuantity || currentProduct?.stock || 0;
          validations.push({
            productId: currentProduct?._id || 'unknown',
            productSlug: currentProduct?.slug || currentProduct?.sku || currentProduct?._id || 'unknown',
            requestedQuantity: item.quantity,
            availableStock: availableStock,
            isOutOfStock: availableStock === 0,
            isInsufficientStock: item.quantity > availableStock,
          });
        }
      }

      return validations;
    },
    enabled: items.length > 0,
    staleTime: 0, // Always validate fresh
  });
};

