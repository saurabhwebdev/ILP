import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, BarChart3, LineChart, PieChart, Clock } from "lucide-react";

const Dashboard = () => {
  const { currentUser } = useAuth();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <h1 className="text-3xl font-bold text-ilp-navy mb-4">Dashboard</h1>
      <p className="text-xl text-gray-600 mb-8">
        Welcome back, {currentUser?.email?.split('@')[0] || 'User'}
      </p>

      <div className="w-full max-w-4xl bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-ilp-navy to-ilp-burgundy p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center">
              <Sparkles className="mr-2" size={24} />
              Working Our Magic
            </h2>
            <Clock size={24} />
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-lg text-gray-700 mb-6">
            We're currently building powerful KPIs and analytics to provide you with actionable insights. 
            Your dashboard will soon display real-time metrics to help optimize your logistics operations.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <BarChart3 size={40} className="text-ilp-navy mb-3" />
              <h3 className="font-medium text-lg">Performance Metrics</h3>
              <p className="text-center text-gray-600 mt-2">Comprehensive KPIs for operational excellence</p>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <LineChart size={40} className="text-ilp-burgundy mb-3" />
              <h3 className="font-medium text-lg">Trend Analysis</h3>
              <p className="text-center text-gray-600 mt-2">Track performance patterns over time</p>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <PieChart size={40} className="text-ilp-navy mb-3" />
              <h3 className="font-medium text-lg">Resource Allocation</h3>
              <p className="text-center text-gray-600 mt-2">Optimize your logistics resource distribution</p>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-blue-700 flex items-center">
              <Sparkles className="mr-2" size={16} />
              <span className="font-medium">Coming Soon:</span> Custom KPI dashboard tailored to your specific needs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
