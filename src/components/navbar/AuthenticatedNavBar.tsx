import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  LogOut,
  User,
  Settings,
  LayoutDashboard,
  Truck,
  Users,
  Repeat,
  Scale,
  Warehouse
} from "lucide-react";

const AuthenticatedNavBar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };
  
  return (
    <nav className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-ilp-navy">ILP</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link 
            to="/dashboard" 
            className={`text-sm font-medium transition-colors flex items-center gap-1 ${
              isActive("/dashboard") 
                ? "text-ilp-burgundy" 
                : "text-gray-600 hover:text-ilp-navy"
            }`}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          
          <Link 
            to="/truck-entry" 
            className={`text-sm font-medium transition-colors flex items-center gap-1 ${
              isActive("/truck-entry") 
                ? "text-ilp-burgundy" 
                : "text-gray-600 hover:text-ilp-navy"
            }`}
          >
            <Truck size={16} />
            <span>Truck Entry</span>
          </Link>
          
          <Link 
            to="/transporter-collaboration" 
            className={`text-sm font-medium transition-colors flex items-center gap-1 ${
              isActive("/transporter-collaboration") 
                ? "text-ilp-burgundy" 
                : "text-gray-600 hover:text-ilp-navy"
            }`}
          >
            <Users size={16} />
            <span>Transporter</span>
          </Link>
          
          <Link 
            to="/shift-handover" 
            className={`text-sm font-medium transition-colors flex items-center gap-1 ${
              isActive("/shift-handover") 
                ? "text-ilp-burgundy" 
                : "text-gray-600 hover:text-ilp-navy"
            }`}
          >
            <Repeat size={16} />
            <span>Shift Handover</span>
          </Link>
          
          <Link 
            to="/weigh-bridge" 
            className={`text-sm font-medium transition-colors flex items-center gap-1 ${
              isActive("/weigh-bridge") 
                ? "text-ilp-burgundy" 
                : "text-gray-600 hover:text-ilp-navy"
            }`}
          >
            <Scale size={16} />
            <span>Weigh Bridge</span>
          </Link>
          
          <Link 
            to="/dock" 
            className={`text-sm font-medium transition-colors flex items-center gap-1 ${
              isActive("/dock") 
                ? "text-ilp-burgundy" 
                : "text-gray-600 hover:text-ilp-navy"
            }`}
          >
            <Warehouse size={16} />
            <span>Dock</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/profile" 
              className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                isActive("/profile") 
                  ? "text-ilp-burgundy" 
                  : "text-gray-600 hover:text-ilp-navy"
              }`}
            >
              <User size={16} />
              <span>Profile</span>
            </Link>
            
            <Link 
              to="/settings" 
              className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                isActive("/settings") 
                  ? "text-ilp-burgundy" 
                  : "text-gray-600 hover:text-ilp-navy"
              }`}
            >
              <Settings size={16} />
              <span>Settings</span>
            </Link>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-1 text-gray-600 hover:text-ilp-red"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </Button>
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
              to="/dashboard" 
              className={`px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${
                isActive("/dashboard") 
                  ? "text-ilp-burgundy bg-gray-50" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-ilp-navy"
              }`}
              onClick={toggleMobileMenu}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            
            <Link 
              to="/truck-entry" 
              className={`px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${
                isActive("/truck-entry") 
                  ? "text-ilp-burgundy bg-gray-50" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-ilp-navy"
              }`}
              onClick={toggleMobileMenu}
            >
              <Truck size={18} />
              <span>Truck Entry</span>
            </Link>
            
            <Link 
              to="/transporter-collaboration" 
              className={`px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${
                isActive("/transporter-collaboration") 
                  ? "text-ilp-burgundy bg-gray-50" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-ilp-navy"
              }`}
              onClick={toggleMobileMenu}
            >
              <Users size={18} />
              <span>Transporter</span>
            </Link>
            
            <Link 
              to="/shift-handover" 
              className={`px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${
                isActive("/shift-handover") 
                  ? "text-ilp-burgundy bg-gray-50" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-ilp-navy"
              }`}
              onClick={toggleMobileMenu}
            >
              <Repeat size={18} />
              <span>Shift Handover</span>
            </Link>
            
            <Link 
              to="/weigh-bridge" 
              className={`px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${
                isActive("/weigh-bridge") 
                  ? "text-ilp-burgundy bg-gray-50" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-ilp-navy"
              }`}
              onClick={toggleMobileMenu}
            >
              <Scale size={18} />
              <span>Weigh Bridge</span>
            </Link>
            
            <Link 
              to="/dock" 
              className={`px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${
                isActive("/dock") 
                  ? "text-ilp-burgundy bg-gray-50" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-ilp-navy"
              }`}
              onClick={toggleMobileMenu}
            >
              <Warehouse size={18} />
              <span>Dock</span>
            </Link>
            
            <Link 
              to="/profile" 
              className={`px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${
                isActive("/profile") 
                  ? "text-ilp-burgundy bg-gray-50" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-ilp-navy"
              }`}
              onClick={toggleMobileMenu}
            >
              <User size={18} />
              <span>Profile</span>
            </Link>
            
            <Link 
              to="/settings" 
              className={`px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${
                isActive("/settings") 
                  ? "text-ilp-burgundy bg-gray-50" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-ilp-navy"
              }`}
              onClick={toggleMobileMenu}
            >
              <Settings size={18} />
              <span>Settings</span>
            </Link>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center justify-start px-3 py-2 gap-2 text-red-500 hover:bg-gray-50 hover:text-red-600 w-full rounded-md text-base font-medium"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default AuthenticatedNavBar; 