import { useAuth } from "@/contexts/AuthContext";
import PublicNavBar from "./PublicNavBar";
import AuthenticatedNavBar from "./AuthenticatedNavBar";

const NavBar = () => {
  const { currentUser } = useAuth();
  
  return currentUser ? <AuthenticatedNavBar /> : <PublicNavBar />;
};

export default NavBar; 