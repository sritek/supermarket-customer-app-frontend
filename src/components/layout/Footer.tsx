const Footer = () => {
  return (
    <footer className="border-t bg-muted/50 mt-auto">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-semibold mb-2 md:mb-4 text-sm md:text-base">Market</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Your trusted neighborhood supermarket online.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2 md:mb-4 text-xs md:text-sm">Shop</h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
              <li><a href="/products" className="hover:text-foreground transition-colors">All Products</a></li>
              <li><a href="/products?category=fruits-vegetables" className="hover:text-foreground transition-colors">Fruits & Vegetables</a></li>
              <li><a href="/products?category=dairy-eggs" className="hover:text-foreground transition-colors">Dairy & Eggs</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2 md:mb-4 text-xs md:text-sm">Account</h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
              <li><a href="/account" className="hover:text-foreground transition-colors">My Account</a></li>
              <li><a href="/orders" className="hover:text-foreground transition-colors">Order History</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2 md:mb-4 text-xs md:text-sm">Support</h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-6 md:mt-8 pt-4 md:pt-8 border-t text-center text-xs md:text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Market. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

