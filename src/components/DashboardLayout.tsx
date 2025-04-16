import { Outlet } from "react-router-dom";
import NavBar from "./navbar/index";

const DashboardLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      
      <div className="flex flex-1">
        {/* Main content */}
        <main className="flex-1 p-6 pt-8 bg-gray-50 min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
