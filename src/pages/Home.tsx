import { Link } from "react-router-dom";
import { useProducts } from "../hooks/useProducts";
import ProductCard from "../components/product/ProductCard";
import Button from "../components/ui/Button";
import { ArrowRight, TrendingUp } from "lucide-react";

const Home = () => {
  const { data: featuredData, isLoading: featuredLoading } = useProducts({
    limit: 12,
    sort: "newest",
  });
  const { data: popularData, isLoading: popularLoading } = useProducts({
    limit: 12,
    sort: "popular",
  });

  const featuredProducts = featuredData?.products || [];
  const popularProducts = popularData?.products || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Image Background */}
      <section className="relative text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=1920&q=80')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="container mx-auto px-4 py-20  md:py-32 relative z-10">
          <div className="max-w-2xl bg-white/10 backdrop-blur-sm p-4 rounded-lg shadow-lg">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Fresh Groceries,
              <br />
              Delivered to Your Door
            </h1>
            <p className="text-lg md:text-xl mb-8 opacity-95">
              Shop the freshest produce, premium groceries, and everyday
              essentials. Quality products at competitive prices, delivered
              fast.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/products">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-gray-100 w-full sm:w-auto"
                >
                  Shop All Products
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/products?sort=popular">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm w-full sm:w-auto"
                >
                  Best Sellers
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Special Offer Banner */}
      <section className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 text-sm md:text-base">
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">
              Special Offer: Free Delivery on Orders Above ₹500 | Limited Time
              Only
            </span>
          </div>
        </div>
      </section>

      {/* Featured Products - New Arrivals */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">New Arrivals</h2>
              <p className="text-muted-foreground">
                Latest additions to our store
              </p>
            </div>
            <Link to="/products?sort=newest">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {featuredLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-80 bg-muted rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {featuredProducts.slice(0, 12).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products available</p>
            </div>
          )}
        </div>
      </section>

      {/* Popular Products - Best Sellers */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Best Sellers</h2>
              <p className="text-muted-foreground">
                Most popular products this week
              </p>
            </div>
            <Link to="/products?sort=popular">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {popularLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-80 bg-muted rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          ) : popularProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {popularProducts.slice(0, 12).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products available</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
