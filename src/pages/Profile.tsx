import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeedbackModal from "@/components/FeedbackModal";

const Profile = () => {
  const { currentUser, userRole } = useAuth();
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  
  // Function to get role badge color based on role
  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-orange-100 text-orange-800';
      case 'GATE':
        return 'bg-blue-100 text-blue-800';
      case 'WEIGHBRIDGE':
        return 'bg-purple-100 text-purple-800';
      case 'DOCK':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-ilp-navy mb-6">User Profile</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-ilp-navy rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{currentUser?.email?.split('@')[0] || 'User'}</h2>
            <p className="text-gray-500">{currentUser?.email}</p>
            
            {/* User Role Badge */}
            {userRole && (
              <span className={`mt-2 inline-block text-sm font-medium py-1 px-3 rounded-full ${getRoleBadgeColor(userRole)}`}>
                {userRole}
              </span>
            )}
          </div>
        </div>
        
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-3">Account Information</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <p className="text-gray-500">Email</p>
              <p>{currentUser?.email}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <p className="text-gray-500">Role</p>
              <p>{userRole || 'User'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <p className="text-gray-500">Account created</p>
              <p>{currentUser?.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <p className="text-gray-500">Last sign in</p>
              <p>{currentUser?.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
        
        <div className="border-t mt-6 pt-6">
          <h3 className="text-lg font-medium mb-3">Help & Feedback</h3>
          <p className="text-gray-500 mb-4">
            We value your input! Help us improve the platform by sharing your feedback, reporting issues, or suggesting improvements.
          </p>
          <Button 
            onClick={() => setIsFeedbackModalOpen(true)}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Share Feedback
          </Button>
        </div>
      </div>
      
      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={isFeedbackModalOpen} 
        onClose={() => setIsFeedbackModalOpen(false)} 
      />
    </div>
  );
};

export default Profile; 