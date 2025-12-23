import { Link } from "react-router-dom";
import {
  ShoppingCart,
  User,
  Search,
  ShoppingBag,
  Menu,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useCartCount } from "../../hooks/useCartCount";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "../../hooks/useProducts";

const Header = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const cartCount = useCartCount();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCategoriesMenu, setShowCategoriesMenu] = useState(false);
  const [, setHoveredCategory] = useState<string | null>(null);
  const [showStars, setShowStars] = useState(false);
  const navigate = useNavigate();
  const categoriesMenuRef = useRef<HTMLDivElement>(null);
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.categories || [];
  const prevCartCountRef = useRef(cartCount);

  // Close categories menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoriesMenuRef.current &&
        !categoriesMenuRef.current.contains(event.target as Node)
      ) {
        setShowCategoriesMenu(false);
        setHoveredCategory(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Animate cart icon with stars when cart count changes
  useEffect(() => {
    if (prevCartCountRef.current !== cartCount) {
      prevCartCountRef.current = cartCount;
      // Trigger star animation asynchronously
      const timer1 = setTimeout(() => {
        setShowStars(true);
      }, 0);
      const timer2 = setTimeout(() => {
        setShowStars(false);
      }, 1000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [cartCount]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center space-x-2 group flex-shrink-0"
          >
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg group-hover:bg-primary/90 transition-colors">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-foreground leading-tight">
                Market
              </span>
              <span className="text-xs text-muted-foreground leading-tight">
                Fresh Groceries
              </span>
            </div>
          </Link>

          {/* Categories Menu */}
          <div
            ref={categoriesMenuRef}
            className="relative hidden lg:block"
            onMouseLeave={() => {
              setShowCategoriesMenu(false);
              setHoveredCategory(null);
            }}
          >
            <button
              onMouseEnter={() => setShowCategoriesMenu(true)}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <Menu className="h-5 w-5" />
              <span>All Categories</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {showCategoriesMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-lg shadow-lg py-2">
                {categories.map((category) => (
                  <div
                    key={category._id}
                    className="relative"
                    onMouseEnter={() => setHoveredCategory(category._id)}
                  >
                    <Link
                      to={`/products?category=${category.slug}`}
                      className="flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setShowCategoriesMenu(false);
                        setHoveredCategory(null);
                      }}
                    >
                      <span>{category.name}</span>
                      {categories.length > 0 && (
                        <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search for products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </form>

          {/* Right side */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isAuthenticated ? (
              <>
                <Link
                  to="/account"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden sm:inline">
                    {user?.name || user?.email}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="text-sm text-primary hover:text-primary/90 transition-colors font-medium"
                >
                  Sign Up
                </Link>
              </>
            )}

            <Link
              to="/cart"
              className="relative flex items-center gap-2 hover:text-primary transition-colors"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6 transition-transform" />
                {/* Star sparkles animation - rising from bottom */}
                {showStars && (
                  <>
                    {/* Star 1 - Far left */}
                    <span
                      className="absolute bottom-0 left-1/2 star-shape"
                      style={{
                        animation: "star-rise-1 0.9s ease-out",
                        transform: "translateX(-50%)",
                        width: "6px",
                        height: "6px",
                      }}
                    />
                    {/* Star 2 - Left */}
                    <span
                      className="absolute bottom-0 left-1/2 star-shape"
                      style={{
                        animation: "star-rise-2 0.9s ease-out 0.1s",
                        transform: "translateX(-50%)",
                        width: "8px",
                        height: "8px",
                      }}
                    />
                    {/* Star 3 - Center left */}
                    <span
                      className="absolute bottom-0 left-1/2 star-shape"
                      style={{
                        animation: "star-rise-3 0.9s ease-out 0.05s",
                        transform: "translateX(-50%)",
                        width: "6px",
                        height: "6px",
                      }}
                    />
                    {/* Star 4 - Center */}
                    <span
                      className="absolute bottom-0 left-1/2 star-shape"
                      style={{
                        animation: "star-rise-4 0.9s ease-out 0.15s",
                        transform: "translateX(-50%)",
                        width: "10px",
                        height: "10px",
                      }}
                    />
                    {/* Star 5 - Center right */}
                    <span
                      className="absolute bottom-0 left-1/2 star-shape"
                      style={{
                        animation: "star-rise-5 0.9s ease-out 0.2s",
                        transform: "translateX(-50%)",
                        width: "7px",
                        height: "7px",
                      }}
                    />
                    {/* Star 6 - Right */}
                    <span
                      className="absolute bottom-0 left-1/2 star-shape"
                      style={{
                        animation: "star-rise-6 0.9s ease-out 0.12s",
                        transform: "translateX(-50%)",
                        width: "8px",
                        height: "8px",
                      }}
                    />
                    {/* Star 7 - Far right */}
                    <span
                      className="absolute bottom-0 left-1/2 star-shape"
                      style={{
                        animation: "star-rise-7 0.9s ease-out 0.25s",
                        transform: "translateX(-50%)",
                        width: "6px",
                        height: "6px",
                      }}
                    />
                    {/* Star 8 - Extra spread */}
                    <span
                      className="absolute bottom-0 left-1/2 star-shape"
                      style={{
                        animation: "star-rise-8 0.9s ease-out 0.18s",
                        transform: "translateX(-50%)",
                        width: "7px",
                        height: "7px",
                      }}
                    />
                  </>
                )}
              </div>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium transition-all duration-300">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
