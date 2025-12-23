import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useProduct } from "../hooks/useProducts";
import { useAddToCart } from "../hooks/useCart";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { cartService } from "../services/cart";
import { toast } from "sonner";
import Button from "../components/ui/Button";
import { ShoppingCart, Minus, Plus } from "lucide-react";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [quantity, setQuantity] = useState(1);
  const { isAuthenticated } = useAuthStore();
  const triggerCartUpdate = useUIStore((state) => state.triggerCartUpdate);
  // Only fetch if slug is defined (prevents /api/products/undefined call)
  const { data, isLoading, error } = useProduct(slug || "", { enabled: !!slug && slug.length > 0 });
  const addToCartMutation = useAddToCart();

  const product = data?.product;

  const handleAddToCart = async () => {
    if (!product || product.stockQuantity === 0) {
      toast.error("Product is out of stock");
      return;
    }

    // Check if requested quantity exceeds available stock
    if (quantity > product.stockQuantity) {
      toast.warning(
        `Only ${product.stockQuantity} item${
          product.stockQuantity > 1 ? "s" : ""
        } available in stock. Please adjust the quantity.`
      );
      setQuantity(product.stockQuantity);
      return;
    }

    if (isAuthenticated) {
      try {
        await addToCartMutation.mutateAsync({
          productId: product._id,
          quantity,
        });
        // Cart query is already invalidated by the mutation
      } catch (error: unknown) {
        const errorMessage =
          (error as { response?: { data?: { error?: string } } })?.response
            ?.data?.error || "Failed to add to cart";

        // Check if it's a stock-related error
        if (
          errorMessage.toLowerCase().includes("stock") ||
          errorMessage.toLowerCase().includes("insufficient")
        ) {
          toast.warning(errorMessage);
        } else {
          toast.error(errorMessage);
        }
      }
    } else {
      // Use slug or fallback to _id for guest cart
      const productSlug = product.slug || product._id;
      cartService.addToGuestCart(productSlug, quantity);
      triggerCartUpdate();
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (!product) return;

    if (newQuantity > product.stockQuantity) {
      toast.warning(
        `Only ${product.stockQuantity} item${
          product.stockQuantity > 1 ? "s" : ""
        } available in stock`
      );
      setQuantity(product.stockQuantity);
    } else if (newQuantity < 1) {
      setQuantity(1);
    } else {
      setQuantity(newQuantity);
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-96 bg-muted rounded"></div>
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4"></div>
              <div className="h-6 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-semibold mb-2">Product not found</h2>
        <p className="text-muted-foreground mb-6">
          The product you're looking for doesn't exist or may have been removed.
        </p>
        <Link to="/products">
          <Button className="mt-4">Back to Products</Button>
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stockQuantity === 0;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <Link
              to={`/products?category=${product.category.slug}`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {product.category.name}
            </Link>
            <h1 className="text-3xl font-bold mt-2">{product.name}</h1>
            <p className="text-2xl font-semibold text-primary mt-4">
              ₹{product.price}
            </p>
          </div>

          {product.description && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground">{product.description}</p>
            </div>
          )}

          <div>
            <p
              className={`text-sm mb-2 ${
                isOutOfStock
                  ? "text-red-600 font-medium"
                  : "text-muted-foreground"
              }`}
            >
              Stock:{" "}
              {isOutOfStock
                ? "Out of Stock"
                : `${product.stockQuantity} available`}
            </p>
          </div>

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Quantity:</label>
              <div className="flex items-center gap-2 border rounded-md">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="p-2 hover:bg-muted transition-colors"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 min-w-[60px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="p-2 hover:bg-muted transition-colors"
                  disabled={quantity >= product.stockQuantity}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Add to Cart Button */}
          <div className="flex gap-4">
            <Button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 ${
                isOutOfStock ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
