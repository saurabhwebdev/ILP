import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading, userRole, pageAccess, checkPageAccess } = useAuth();
  const [checkingAccess, setCheckingAccess] = useState(false);
  const location = useLocation();
  
  // Extract the current page path without the leading slash
  const currentPage = location.pathname.split('/')[1] || 'dashboard';
  
  if (loading) {
    // Show loading spinner while checking authentication
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ilp-navy"></div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  // Check if user has access to the current page
  // Admin has access to everything
  if (userRole === "ADMIN") {
    return <>{children}</>;
  }
  
  // For other roles, check page access permissions
  const hasAccess = checkPageAccess(currentPage);
  
  if (!hasAccess) {
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
