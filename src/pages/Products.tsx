import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useProducts,
  useProductsByCategory,
  useSearchProducts,
  useCategories,
} from "../hooks/useProducts";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import ProductCard from "../components/product/ProductCard";
import FilterDrawer from "../components/product/FilterDrawer";
import { Filter } from "lucide-react";
import type { Product } from "../services/products";

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get filter values from URL params (applied filters)
  const appliedCategory = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const appliedMinPrice = searchParams.get("minPrice");
  const appliedMaxPrice = searchParams.get("maxPrice");
  const appliedInStock = searchParams.get("inStock");
  const appliedSort = searchParams.get("sort") || "newest";

  // Local state for filter inputs (not applied until button is clicked)
  // Initialize from URL params
  const [category, setCategory] = useState(appliedCategory);
  const [minPrice, setMinPrice] = useState(appliedMinPrice || "");
  const [maxPrice, setMaxPrice] = useState(appliedMaxPrice || "");
  const [inStock, setInStock] = useState(appliedInStock || "");
  const [sort, setSort] = useState(appliedSort);

  // Sync local state when URL params change (e.g., from external navigation or after applying filters)
  // Use a ref to track previous values to avoid unnecessary updates
  const prevAppliedRef = useRef({
    category: appliedCategory,
    minPrice: appliedMinPrice,
    maxPrice: appliedMaxPrice,
    inStock: appliedInStock,
    sort: appliedSort,
  });

  // Sync local state when URL params change (e.g., after applying filters or external navigation)
  // This syncs form inputs with URL state when filters are applied or URL changes externally
  useEffect(() => {
    const prev = prevAppliedRef.current;
    const hasChanges =
      prev.category !== appliedCategory ||
      prev.minPrice !== appliedMinPrice ||
      prev.maxPrice !== appliedMaxPrice ||
      prev.inStock !== appliedInStock ||
      prev.sort !== appliedSort;

    if (hasChanges) {
      // Update local state to match applied filters from URL
      // This is necessary when filters are applied or when navigating with URL params
      // Note: Syncing state from URL params is a valid use case for useEffect
      requestAnimationFrame(() => {
        setCategory(appliedCategory);
        setMinPrice(appliedMinPrice || "");
        setMaxPrice(appliedMaxPrice || "");
        setInStock(appliedInStock || "");
        setSort(appliedSort);
      });
      prevAppliedRef.current = {
        category: appliedCategory,
        minPrice: appliedMinPrice,
        maxPrice: appliedMaxPrice,
        inStock: appliedInStock,
        sort: appliedSort,
      };
    }
  }, [
    appliedCategory,
    appliedMinPrice,
    appliedMaxPrice,
    appliedInStock,
    appliedSort,
  ]);

  // Fetch categories for filter dropdown (only once, doesn't need to refresh)
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.categories || [];

  // Fetch products based on APPLIED filters (from URL params)
  const hasSearch = search && search.trim().length > 0;
  const hasCategory = appliedCategory && appliedCategory.trim().length > 0;

  // Convert inStock string to boolean | undefined
  const appliedInStockBoolean: boolean | undefined =
    appliedInStock === "true"
      ? true
      : appliedInStock === "false"
      ? false
      : undefined;

  const { data: categoryData, isLoading: isLoadingCategory } =
    useProductsByCategory(
      appliedCategory,
      {
        page: 1,
        limit: 100,
        minPrice: appliedMinPrice ? parseFloat(appliedMinPrice) : undefined,
        maxPrice: appliedMaxPrice ? parseFloat(appliedMaxPrice) : undefined,
        inStock: appliedInStockBoolean,
        sort: appliedSort,
      },
      { enabled: !!hasCategory && !hasSearch }
    );

  const { data: searchData, isLoading: isLoadingSearch } = useSearchProducts(
    search || ""
  );

  const { data: allProductsData, isLoading: isLoadingAll } = useProducts(
    {
      page: 1,
      limit: 100,
      category: appliedCategory || undefined,
      minPrice: appliedMinPrice ? parseFloat(appliedMinPrice) : undefined,
      maxPrice: appliedMaxPrice ? parseFloat(appliedMaxPrice) : undefined,
      inStock: appliedInStockBoolean,
      sort: appliedSort,
    },
    { enabled: !hasCategory && !hasSearch }
  );

  // Determine which data to use (use APPLIED filters from URL, not local state)
  let products: Product[] = [];
  let isLoading = false;

  if (hasSearch) {
    products = searchData?.products || [];
    isLoading = isLoadingSearch;
  } else if (hasCategory) {
    // Use category data if available, fallback to empty array while loading
    products = categoryData?.products || [];
    isLoading = isLoadingCategory;
  } else {
    // Use all products data if available, fallback to empty array while loading
    products = allProductsData?.products || [];
    isLoading = isLoadingAll;
  }

  // Ensure we show loading state only when actually fetching and no data exists
  // If we have cached data, don't show loading skeleton
  const showLoadingSkeleton = isLoading && products.length === 0;

  const applyFilters = () => {
    const params = new URLSearchParams();

    // Preserve search if it exists
    if (hasSearch) {
      params.set("search", search);
    }

    // Apply filters
    if (category && category.trim().length > 0) {
      params.set("category", category);
    }

    if (minPrice && minPrice.trim().length > 0) {
      params.set("minPrice", minPrice);
    }

    if (maxPrice && maxPrice.trim().length > 0) {
      params.set("maxPrice", maxPrice);
    }

    if (inStock && inStock.trim().length > 0) {
      params.set("inStock", inStock);
    }

    // Always set sort (default to newest if empty)
    params.set("sort", sort || "newest");

    setSearchParams(params, { replace: true });
  };

  const clearFilters = () => {
    // Clear local state
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setInStock("");
    setSort("newest");

    // Clear URL params (but preserve search if exists)
    const params = new URLSearchParams();
    if (hasSearch) {
      params.set("search", search);
    }
    // Set default sort
    params.set("sort", "newest");
    setSearchParams(params, { replace: true });
  };

  // Check if filters have changed from applied values
  const hasFilterChanges =
    category !== appliedCategory ||
    minPrice !== (appliedMinPrice || "") ||
    maxPrice !== (appliedMaxPrice || "") ||
    inStock !== (appliedInStock || "") ||
    sort !== appliedSort;

  // Mobile drawer state
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Count active filters for badge
  const activeFiltersCount = [
    appliedCategory,
    appliedMinPrice,
    appliedMaxPrice,
    appliedInStock,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Filter Button - Only visible on mobile */}
      <div className="sticky top-14 z-30 bg-white border-b md:hidden">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">
              {hasCategory
                ? categories.find((c) => c.slug === appliedCategory)?.name ||
                  appliedCategory
                : hasSearch
                ? `Search: ${search}`
                : "All Products"}
            </h1>
            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Desktop Filters Sidebar - Hidden on mobile */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-6 space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
              <h2 className="text-xl font-semibold">Filters</h2>

              {/* Category Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Sort By
                </label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="popular">Popular</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Price Range
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Availability
                </label>
                <select
                  value={inStock}
                  onChange={(e) => setInStock(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">All</option>
                  <option value="true">In Stock</option>
                  <option value="false">Out of Stock</option>
                </select>
              </div>

              {/* Apply Filters Button */}
              <Button
                onClick={applyFilters}
                className="w-full"
                disabled={!hasFilterChanges}
              >
                Apply Filters
              </Button>

              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </aside>

          {/* Products Grid - Full width on mobile */}
          <div className="flex-1 min-w-0">
            {/* Desktop Title - Hidden on mobile */}
            <div className="hidden md:block mb-6">
              <h1 className="text-2xl md:text-3xl font-bold">
                {hasCategory
                  ? `Category: ${
                      categories.find((c) => c.slug === appliedCategory)
                        ?.name || appliedCategory
                    }`
                  : hasSearch
                  ? `Search: ${search}`
                  : "All Products"}
              </h1>
            </div>

            {showLoadingSkeleton ? (
              <div className="animate-pulse">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-64 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 pb-6">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        categories={categories}
        category={category}
        minPrice={minPrice}
        maxPrice={maxPrice}
        inStock={inStock}
        sort={sort}
        onCategoryChange={setCategory}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
        onInStockChange={setInStock}
        onSortChange={setSort}
        onApply={applyFilters}
        onClear={clearFilters}
        hasFilterChanges={hasFilterChanges}
      />
    </div>
  );
};

export default Products;
