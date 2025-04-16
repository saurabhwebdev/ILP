import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const { currentUser } = useAuth();
  
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
              <p className="text-gray-500">Account created</p>
              <p>{currentUser?.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <p className="text-gray-500">Last sign in</p>
              <p>{currentUser?.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 