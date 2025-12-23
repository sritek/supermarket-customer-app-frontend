import { useQuery } from "@tanstack/react-query";
import {
  productService,
  type Product,
  type Category,
  type ProductsResponse,
} from "../services/products";

export const useProducts = (
  params?: {
    page?: number;
    limit?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sort?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery<ProductsResponse>({
    queryKey: ["products", params],
    queryFn: () => productService.getProducts(params),
    enabled: options?.enabled !== false,
  });
};

export const useProduct = (slug: string, options?: { enabled?: boolean }) => {
  return useQuery<{ success: boolean; product: Product }>({
    queryKey: ["product", slug],
    queryFn: () => productService.getProduct(slug),
    enabled: (options?.enabled !== undefined ? options.enabled : !!slug) && slug.length > 0,
  });
};

export const useProductsByCategory = (
  categorySlug: string,
  params?: {
    page?: number;
    limit?: number;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sort?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery<ProductsResponse & { category: Category }>({
    queryKey: ["productsByCategory", categorySlug, params],
    queryFn: () => productService.getProductsByCategory(categorySlug, params),
    enabled: options?.enabled !== false && !!categorySlug,
  });
};

export const useSearchProducts = (query: string) => {
  return useQuery<{ success: boolean; products: Product[] }>({
    queryKey: ["searchProducts", query],
    queryFn: () => productService.searchProducts(query),
    enabled: !!query && query.trim().length > 0,
  });
};

export const useCategories = () => {
  return useQuery<{ success: boolean; categories: Category[] }>({
    queryKey: ["categories"],
    queryFn: () => productService.getCategories(),
  });
};
