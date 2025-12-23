import api from "./api";

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  price: number;
  stockQuantity: number;
  images: string[];
  status: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface ProductsResponse {
  success: boolean;
  products: Product[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const productService = {
  getProducts: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sort?: string;
  }): Promise<ProductsResponse> => {
    const response = await api.get("/products", { params });
    return response.data;
  },

  getProduct: async (
    slug: string
  ): Promise<{ success: boolean; product: Product }> => {
    const response = await api.get(`/products/${slug}`);
    return response.data;
  },

  searchProducts: async (
    query: string
  ): Promise<{ success: boolean; products: Product[] }> => {
    const response = await api.get("/products/search", {
      params: { q: query },
    });
    return response.data;
  },

  getProductsByCategory: async (
    categorySlug: string,
    params?: {
      page?: number;
      limit?: number;
      minPrice?: number;
      maxPrice?: number;
      inStock?: boolean;
      sort?: string;
    }
  ): Promise<ProductsResponse & { category: Category }> => {
    // Convert boolean inStock to string for query params
    const queryParams: Record<string, string | number | boolean | undefined> = {
      ...params,
    };
    if (queryParams.inStock !== undefined) {
      queryParams.inStock = queryParams.inStock ? "true" : "false";
    }

    const response = await api.get(`/products/category/${categorySlug}`, {
      params: queryParams,
    });

    return response.data;
  },

  getCategories: async (): Promise<{
    success: boolean;
    categories: Category[];
  }> => {
    const response = await api.get("/categories");
    return response.data;
  },
};
