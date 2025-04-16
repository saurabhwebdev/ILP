import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { currentUser } = useAuth();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <h1 className="text-3xl font-bold text-ilp-navy mb-4">Dashboard</h1>
      <p className="text-xl text-gray-600 mb-2">
        Welcome back, {currentUser?.email?.split('@')[0] || 'User'}
      </p>
      <p className="text-2xl font-medium text-ilp-burgundy mt-8">
        The app will come here
      </p>
    </div>
  );
};

export default Dashboard;
