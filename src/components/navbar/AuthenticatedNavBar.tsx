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

// Navigation items definition
const navigationItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, accessKey: "dashboard" },
  { path: "/truck-entry", label: "Truck Entry", icon: Truck, accessKey: "truck-entry" },
  { path: "/transporter-collaboration", label: "Transporter", icon: Users, accessKey: "transporter-collaboration" },
  { path: "/shift-handover", label: "Shift Handover", icon: Repeat, accessKey: "shift-handover" },
  { path: "/weigh-bridge", label: "Weigh Bridge", icon: Scale, accessKey: "weigh-bridge" },
  { path: "/dock", label: "Dock", icon: Warehouse, accessKey: "dock" },
  { path: "/profile", label: "Profile", icon: User, accessKey: "profile" },
  { path: "/settings", label: "Settings", icon: Settings, accessKey: "settings" }
];

const AuthenticatedNavBar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, logout, checkPageAccess, userRole } = useAuth();
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
  
  // Filter navigation items based on user's role and access permissions
  const authorizedNavItems = navigationItems.filter(item => 
    checkPageAccess(item.accessKey)
  );

  // Settings and Profile are grouped together
  const mainNavItems = authorizedNavItems.filter(item => 
    !["profile", "settings"].includes(item.accessKey)
  );
  
  const accountNavItems = authorizedNavItems.filter(item => 
    ["profile", "settings"].includes(item.accessKey)
  );
  
  return (
    <nav className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-ilp-navy">ILP</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {/* Main Navigation Items */}
          {mainNavItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                isActive(item.path) 
                  ? "text-ilp-burgundy" 
                  : "text-gray-600 hover:text-ilp-navy"
              }`}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </Link>
          ))}
          
          {/* User Menu */}
          <div className="flex items-center gap-4">
            {accountNavItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                  isActive(item.path) 
                    ? "text-ilp-burgundy" 
                    : "text-gray-600 hover:text-ilp-navy"
                }`}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </Link>
            ))}
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-1 text-gray-600 hover:bg-ilp-red hover:text-white"
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
            {/* All navigation items */}
            {authorizedNavItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={`px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${
                  isActive(item.path) 
                    ? "text-ilp-burgundy bg-gray-50" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-ilp-navy"
                }`}
                onClick={toggleMobileMenu}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            ))}
            
            {/* Logout Button */}
            <Button
              variant="ghost"
              className="w-full justify-start px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 text-gray-600 hover:bg-ilp-red hover:text-white"
              onClick={() => {
                handleLogout();
                toggleMobileMenu();
              }}
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