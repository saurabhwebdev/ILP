import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const PublicNavBar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <nav className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-ilp-navy">ILP</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors ${
              isActive("/") 
                ? "text-ilp-burgundy" 
                : "text-gray-600 hover:text-ilp-navy"
            }`}
          >
            Home
          </Link>
          
          <Link 
            to="/features" 
            className={`text-sm font-medium transition-colors ${
              isActive("/features") 
                ? "text-ilp-burgundy" 
                : "text-gray-600 hover:text-ilp-navy"
            }`}
          >
            Features
          </Link>
          
          <Link 
            to="/pricing" 
            className={`text-sm font-medium transition-colors ${
              isActive("/pricing") 
                ? "text-ilp-burgundy" 
                : "text-gray-600 hover:text-ilp-navy"
            }`}
          >
            Pricing
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            
            <Link to="/signup">
              <Button className="bg-ilp-navy hover:bg-ilp-navy/90 text-white">
                Sign up
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleMobileMenu} 
            className="text-gray-600"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white absolute top-16 inset-x-0 z-50 shadow-md pt-2 pb-4">
          <div className="flex flex-col space-y-3 px-6">
            <Link 
              to="/" 
              className={`px-3 py-2 rounded-md text-base font-medium ${
                isActive("/") 
                  ? "text-ilp-burgundy bg-gray-50" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-ilp-navy"
              }`}
              onClick={toggleMobileMenu}
            >
              Home
            </Link>
            
            <Link 
              to="/features" 
              className={`px-3 py-2 rounded-md text-base font-medium ${
                isActive("/features") 
                  ? "text-ilp-burgundy bg-gray-50" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-ilp-navy"
              }`}
              onClick={toggleMobileMenu}
            >
              Features
            </Link>
            
            <Link 
              to="/pricing" 
              className={`px-3 py-2 rounded-md text-base font-medium ${
                isActive("/pricing") 
                  ? "text-ilp-burgundy bg-gray-50" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-ilp-navy"
              }`}
              onClick={toggleMobileMenu}
            >
              Pricing
            </Link>
            
            <Link 
              to="/login" 
              className="px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-ilp-navy"
              onClick={toggleMobileMenu}
            >
              Log in
            </Link>
            
            <Link 
              to="/signup" 
              className="px-3 py-2 rounded-md text-base font-medium text-ilp-navy hover:bg-gray-50"
              onClick={toggleMobileMenu}
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default PublicNavBar; 