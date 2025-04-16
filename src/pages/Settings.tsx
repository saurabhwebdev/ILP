import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlusCircle, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  RefreshCw, 
  Search, 
  Truck, 
  ShieldCheck, 
  Scale, 
  Warehouse, 
  Users, 
  Shield, 
  Clock,
  Info,
  MessageSquare,
  HardHat
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  arrayUnion, 
  arrayRemove, 
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs as TabsComponent,
  TabsContent as TabsComponentContent,
  TabsList as TabsComponentList,
  TabsTrigger as TabsComponentTrigger
} from "@/components/ui/tabs";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
//Import the FeedbackList component near the top with the other imports
import FeedbackList from "@/components/FeedbackList";

// Approval request interface
interface ApprovalRequest {
  id: string;
  truckId: string;
  truckNumber?: string;
  vehicleNumber?: string;
  driverName?: string;
  requestedBy: string;
  requestedAt: any;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestType?: "documentsIncomplete" | "weightDiscrepancy";
  // Weight discrepancy specific fields
  invoiceWeight?: number;
  actualWeight?: number;
  averageWeight?: number;
  totalWeight?: number;
  weightCount?: number;
  difference?: number;
  percentageDiff?: number;
  threshold?: number;
}

// Truck interface
interface Truck {
  id: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile: string;
  transporter: string;
  depotName: string;
  materialType: string;
  arrivalDateTime: any;
  status: string;
  isDeleted?: boolean;
  deletedAt?: any;
  deletedBy?: string;
  channelType?: "green" | "orange";
}

// TruckManagement component
const TruckManagement = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [deletedTrucks, setDeletedTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; truckId: string; action: 'delete' | 'restore' }>({ 
    open: false, 
    truckId: "", 
    action: 'delete' 
  });
  const [channelDialog, setChannelDialog] = useState<{ open: boolean; truckId: string; currentChannel?: "green" | "orange" }>({
    open: false,
    truckId: "",
    currentChannel: undefined
  });

  // Fetch trucks on component mount
  useEffect(() => {
    fetchTrucks();
  }, []);

  // Fetch trucks from Firestore
  const fetchTrucks = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Get all trucks
      const trucksRef = collection(db, "transporterCollaborations");
      const allTrucksQuery = query(
        trucksRef,
        orderBy("createdAt", "desc"),
        limit(100)
      );
      
      const snapshot = await getDocs(allTrucksQuery);
      const allTrucks: Truck[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        allTrucks.push({
          id: doc.id,
          vehicleNumber: data.vehicleNumber || '',
          driverName: data.driverName || '',
          driverMobile: data.driverMobile || '',
          transporter: data.transporter || '',
          depotName: data.depotName || '',
          materialType: data.materialType || '',
          arrivalDateTime: data.arrivalDateTime,
          status: data.status || '',
          isDeleted: data.isDeleted === true,
          deletedAt: data.deletedAt,
          deletedBy: data.deletedBy,
          channelType: data.channelType
        });
      });
      
      // Split into active and deleted trucks
      const activeTrucksList = allTrucks.filter(truck => !truck.isDeleted);
      const deletedTrucksList = allTrucks.filter(truck => truck.isDeleted);
      
      setTrucks(activeTrucksList);
      setDeletedTrucks(deletedTrucksList);
      
    } catch (error) {
      console.error("Error fetching trucks:", error);
      toast({
        title: "Error",
        description: "Failed to load trucks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter trucks based on search term
  const filteredTrucks = trucks.filter(truck => 
    truck.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    truck.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    truck.transporter.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredDeletedTrucks = deletedTrucks.filter(truck => 
    truck.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    truck.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    truck.transporter.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle truck deletion
  const handleDeleteTruck = async (truckId: string) => {
    if (!currentUser) return;
    
    try {
      const truckRef = doc(db, "transporterCollaborations", truckId);
      
      // Use serverTimestamp for Firestore
      await updateDoc(truckRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: currentUser.uid,
        status: "Deleted"
      });
      
      // Update local state
      const updatedTrucks = trucks.filter(t => t.id !== truckId);
      const deletedTruck = trucks.find(t => t.id === truckId);
      
      if (deletedTruck) {
        const updatedDeletedTruck = {
          ...deletedTruck,
          isDeleted: true,
          // Use a JavaScript Date object for local state
          deletedAt: new Date(),
          deletedBy: currentUser.uid,
          status: "Deleted"
        };
        
        setTrucks(updatedTrucks);
        setDeletedTrucks([updatedDeletedTruck, ...deletedTrucks]);
      }
      
      toast({
        title: "Truck Deleted",
        description: "The truck has been moved to deleted trucks.",
      });
      
    } catch (error) {
      console.error("Error deleting truck:", error);
      toast({
        title: "Error",
        description: "Failed to delete truck. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle truck restoration
  const handleRestoreTruck = async (truckId: string) => {
    if (!currentUser) return;
    
    try {
      const truckRef = doc(db, "transporterCollaborations", truckId);
      
      await updateDoc(truckRef, {
        isDeleted: false,
        status: "Waiting", // Reset to waiting status
        restoredAt: new Date(),
        restoredBy: currentUser.uid
      });
      
      // Update local state
      const updatedDeletedTrucks = deletedTrucks.filter(t => t.id !== truckId);
      const restoredTruck = deletedTrucks.find(t => t.id === truckId);
      
      if (restoredTruck) {
        const updatedRestoredTruck = {
          ...restoredTruck,
          isDeleted: false,
          status: "Waiting"
        };
        
        setDeletedTrucks(updatedDeletedTrucks);
        setTrucks([updatedRestoredTruck, ...trucks]);
      }
      
      toast({
        title: "Truck Restored",
        description: "The truck has been restored and is now active.",
      });
      
    } catch (error) {
      console.error("Error restoring truck:", error);
      toast({
        title: "Error",
        description: "Failed to restore truck. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle confirmation dialog
  const openConfirmDialog = (truckId: string, action: 'delete' | 'restore') => {
    setConfirmDialog({
      open: true,
      truckId,
      action
    });
  };

  const handleConfirmAction = () => {
    if (confirmDialog.action === 'delete') {
      handleDeleteTruck(confirmDialog.truckId);
    } else {
      handleRestoreTruck(confirmDialog.truckId);
    }
    setConfirmDialog({ open: false, truckId: "", action: 'delete' });
  };

  // Open channel assignment dialog
  const openChannelDialog = (truck: Truck) => {
    setChannelDialog({
      open: true,
      truckId: truck.id,
      currentChannel: truck.channelType
    });
  };

  // Handle channel assignment
  const handleChannelAssignment = async (channelType: "green" | "orange") => {
    if (!currentUser) return;
    
    try {
      const truckRef = doc(db, "transporterCollaborations", channelDialog.truckId);
      
      // Update in Firestore
      await updateDoc(truckRef, {
        channelType: channelType,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      });
      
      // Update local state
      setTrucks(prev => 
        prev.map(truck => 
          truck.id === channelDialog.truckId 
            ? { ...truck, channelType: channelType }
            : truck
        )
      );
      
      toast({
        title: "Channel Updated",
        description: `Truck has been assigned to ${channelType} channel.`,
      });
      
      // Close the dialog
      setChannelDialog({ open: false, truckId: "" });
    } catch (error) {
      console.error("Error assigning channel:", error);
      toast({
        title: "Error",
        description: "Failed to assign channel. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and refresh */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search trucks..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchTrucks}
          disabled={loading}
          className="flex gap-1 items-center"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {/* Tabs for active and deleted trucks */}
      <TabsComponent defaultValue="active">
        <TabsComponentList className="mb-4">
          <TabsComponentTrigger value="active">Active Trucks</TabsComponentTrigger>
          <TabsComponentTrigger value="deleted">Deleted Trucks</TabsComponentTrigger>
        </TabsComponentList>
        
        <TabsComponentContent value="active">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTrucks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Trash2 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No trucks found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Number</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transporter</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depot</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Channel</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTrucks.map((truck) => (
                    <tr key={truck.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {truck.vehicleNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{truck.driverName}</div>
                        <div className="text-xs text-gray-400">{truck.driverMobile}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {truck.transporter}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {truck.depotName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={
                          truck.status === "Inside" ? "bg-green-500" :
                          truck.status === "Waiting" ? "bg-amber-500" :
                          truck.status === "In Process" ? "bg-blue-500" :
                          "bg-gray-500"
                        }>
                          {truck.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {truck.channelType ? (
                          <Badge className={
                            truck.channelType === "green" 
                              ? "bg-green-100 text-green-800 border border-green-200" 
                              : "bg-orange-100 text-orange-800 border border-orange-200"
                          }>
                            {truck.channelType === "green" ? "Green Channel" : "Orange Channel"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800">
                            Not Assigned
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => openChannelDialog(truck)}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1" />
                            Channel
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            onClick={() => openConfirmDialog(truck.id, 'delete')}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsComponentContent>
        
        <TabsComponentContent value="deleted">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredDeletedTrucks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Trash2 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No deleted trucks found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Number</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transporter</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deleted On</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDeletedTrucks.map((truck) => (
                    <tr key={truck.id} className="bg-red-50/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {truck.vehicleNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{truck.driverName}</div>
                        <div className="text-xs text-gray-400">{truck.driverMobile}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {truck.transporter}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {truck.deletedAt ? 
                          (typeof truck.deletedAt.toDate === 'function' 
                            ? format(new Date(truck.deletedAt.toDate()), "PPp") 
                            : format(new Date(truck.deletedAt), "PPp")
                          ) : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          onClick={() => openConfirmDialog(truck.id, 'restore')}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsComponentContent>
      </TabsComponent>
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === 'delete' ? 'Delete Truck' : 'Restore Truck'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === 'delete' 
                ? 'Are you sure you want to delete this truck? It will be moved to the deleted trucks list and can be restored later.'
                : 'Are you sure you want to restore this truck? It will be moved back to the active trucks list.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            >
              Cancel
            </Button>
            <Button 
              variant={confirmDialog.action === 'delete' ? 'destructive' : 'default'}
              onClick={handleConfirmAction}
            >
              {confirmDialog.action === 'delete' ? 'Delete' : 'Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Channel Assignment Dialog */}
      <Dialog open={channelDialog.open} onOpenChange={(open) => !open && setChannelDialog({ ...channelDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Channel</DialogTitle>
            <DialogDescription>
              Select a channel type for this truck. Green channel trucks have expedited processing, while orange channel trucks require standard processing.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              onClick={() => handleChannelAssignment("green")}
              className={`h-24 flex flex-col items-center justify-center border bg-green-50 hover:bg-green-100 text-green-800 ${channelDialog.currentChannel === "green" ? "ring-2 ring-green-500" : ""}`}
            >
              <ShieldCheck className="h-8 w-8 mb-2" />
              <span className="font-medium">Green Channel</span>
              <span className="text-xs mt-1">Expedited Processing</span>
            </Button>

            <Button
              onClick={() => handleChannelAssignment("orange")}
              className={`h-24 flex flex-col items-center justify-center border bg-orange-50 hover:bg-orange-100 text-orange-800 ${channelDialog.currentChannel === "orange" ? "ring-2 ring-orange-500" : ""}`}
            >
              <ShieldAlert className="h-8 w-8 mb-2" />
              <span className="font-medium">Orange Channel</span>
              <span className="text-xs mt-1">Standard Processing</span>
            </Button>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setChannelDialog({ open: false, truckId: "" })}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// WeighbridgeSettings component
const WeighbridgeSettings = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weightThresholdPercentage, setWeightThresholdPercentage] = useState(5); // Default 5%

  // Fetch weighbridge settings on component mount
  useEffect(() => {
    fetchWeighbridgeSettings();
  }, []);

  // Fetch weighbridge settings from Firestore
  const fetchWeighbridgeSettings = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const settingsRef = doc(db, "organizationSettings", "weighbridgeSettings");
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setWeightThresholdPercentage(data.weightThresholdPercentage || 5);
      }
    } catch (error) {
      console.error("Error fetching weighbridge settings:", error);
      toast({
        title: "Error",
        description: "Failed to load weighbridge settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save weighbridge settings
  const saveWeighbridgeSettings = async () => {
    if (!currentUser) return;
    
    try {
      setSaving(true);
      
      const settingsRef = doc(db, "organizationSettings", "weighbridgeSettings");
      
      await setDoc(settingsRef, {
        weightThresholdPercentage: weightThresholdPercentage,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      }, { merge: true });
      
      toast({
        title: "Settings Saved",
        description: "Weighbridge settings have been updated successfully."
      });
    } catch (error) {
      console.error("Error saving weighbridge settings:", error);
      toast({
        title: "Error",
        description: "Failed to save weighbridge settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Weighbridge Settings</h2>
        <Button
          onClick={saveWeighbridgeSettings}
          disabled={saving || loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Weight Discrepancy Threshold
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Set the maximum allowed percentage difference between invoice weight and actual weight. If the difference exceeds this threshold, approval will be required.
          </p>
          
          <div className="flex items-end gap-4">
            <div className="w-full max-w-xs">
              <Label htmlFor="weightThreshold" className="mb-2 block">
                Weight Threshold Percentage
              </Label>
              <Input
                id="weightThreshold"
                type="number"
                value={weightThresholdPercentage}
                onChange={(e) => setWeightThresholdPercentage(Number(e.target.value))}
                min={0}
                max={100}
                step={0.5}
              />
            </div>
            <div className="flex items-center h-10">
              <span className="font-medium">%</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800 mb-1">How it works:</p>
            <p className="text-sm text-yellow-700">
              When the difference between invoice weight and actual weight exceeds {weightThresholdPercentage}%, an approval request will be created and approval will be required before proceeding.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// DockSettings component
const DockSettings = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docks, setDocks] = useState<{ id: string; name: string; isServiceable: boolean }[]>([]);
  const [newDock, setNewDock] = useState("");
  const [assignedTrucks, setAssignedTrucks] = useState<Record<string, number>>({});

  // Fetch dock settings and truck assignment data on component mount
  useEffect(() => {
    fetchDockSettings();
    fetchTruckAssignments();
  }, []);

  // Fetch dock settings from Firestore
  const fetchDockSettings = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      console.log("Fetching dock settings from Firebase...");
      
      const settingsRef = doc(db, "organizationSettings", "transporterSettings");
      const settingsSnapshot = await getDoc(settingsRef);
      
      // Default docks to use if needed
      const defaultDocks = [
        { id: "dock1", name: "Dock 1", isServiceable: true },
        { id: "dock2", name: "Dock 2", isServiceable: true },
        { id: "dock3", name: "Dock 3", isServiceable: true },
        { id: "dock4", name: "Dock 4", isServiceable: true },
        { id: "dock5", name: "Dock 5", isServiceable: true }
      ];
      
      if (settingsSnapshot.exists()) {
        const data = settingsSnapshot.data();
        console.log("Settings data from Firebase:", data);
        if (data.docks) {
          console.log("Loaded docks from Firebase:", data.docks);
          setDocks(data.docks);
        } else {
          console.log("No docks found in settings, initializing defaults");
          // Initialize with default values and save them to Firestore
          setDocks(defaultDocks);
          
          // Update the document with default docks
          await updateDoc(settingsRef, {
            docks: defaultDocks,
            lastUpdatedAt: serverTimestamp(),
            lastUpdatedBy: currentUser.uid
          });
          console.log("Added default docks to existing settings document");
        }
      } else {
        console.log("Settings document doesn't exist, creating with defaults");
        // Create settings document with default docks
        await setDoc(settingsRef, {
          docks: defaultDocks,
          depots: [],
          transporters: [],
          suppliers: [],
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
          lastUpdatedAt: serverTimestamp(),
          lastUpdatedBy: currentUser.uid
        });
        console.log("Created new settings document with default docks");
        setDocks(defaultDocks);
      }
    } catch (error) {
      console.error("Error fetching dock settings:", error);
      toast({
        title: "Error",
        description: "Failed to load dock settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch trucks to check which docks are assigned
  const fetchTruckAssignments = async () => {
    try {
      const trucksQuery = query(
        collection(db, "transporterCollaborations"),
        where("dockAssigned", "!=", null)
      );
      
      const snapshot = await getDocs(trucksQuery);
      const assignments: Record<string, number> = {};
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.dockAssigned) {
          assignments[data.dockAssigned] = (assignments[data.dockAssigned] || 0) + 1;
        }
      });
      
      setAssignedTrucks(assignments);
    } catch (error) {
      console.error("Error fetching truck assignments:", error);
    }
  };

  // Save dock settings to Firestore
  const saveDockSettings = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save settings.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSaving(true);
      console.log("Saving dock settings to Firebase:", docks);
      
      const settingsRef = doc(db, "organizationSettings", "transporterSettings");
      const settingsSnapshot = await getDoc(settingsRef);
      
      if (settingsSnapshot.exists()) {
        // Update existing document
        await updateDoc(settingsRef, {
          docks: docks,
          lastUpdatedAt: serverTimestamp(),
          lastUpdatedBy: currentUser.uid
        });
        console.log("Successfully updated dock settings in existing document");
      } else {
        // Create new document with dock settings
        await setDoc(settingsRef, {
          docks: docks,
          depots: [],
          transporters: [],
          suppliers: [],
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
          lastUpdatedAt: serverTimestamp(),
          lastUpdatedBy: currentUser.uid
        });
        console.log("Created new transporterSettings document with dock settings");
      }
      
      // Verify the save was successful by fetching the updated data
      const verifySnapshot = await getDoc(settingsRef);
      if (verifySnapshot.exists()) {
        const data = verifySnapshot.data();
        console.log("Verification - Retrieved dock settings:", data.docks);
      }
      
      toast({
        title: "Settings Saved",
        description: "Dock settings have been updated successfully.",
      });
      
      // Refresh the docks list to ensure we have the latest data
      fetchDockSettings();
      
    } catch (error) {
      console.error("Error saving dock settings:", error);
      toast({
        title: "Error",
        description: "Failed to save dock settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Add a new dock
  const addDock = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to add docks.",
        variant: "destructive",
      });
      return;
    }
    
    if (!newDock.trim()) {
      toast({
        title: "Error",
        description: "Please enter a dock name.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if dock with same name already exists
    if (docks.some(dock => dock.name.toLowerCase() === newDock.trim().toLowerCase())) {
      toast({
        title: "Error",
        description: "A dock with this name already exists.",
        variant: "destructive",
      });
      return;
    }
    
    const newDockItem = {
      id: `dock${Date.now()}`,
      name: newDock.trim(),
      isServiceable: true
    };
    
    // Update local state
    const updatedDocks = [...docks, newDockItem];
    setDocks(updatedDocks);
    setNewDock("");
    
    try {
      setSaving(true);
      console.log("Adding new dock and saving to Firebase:", newDockItem);
      
      // Save directly to Firestore
      const settingsRef = doc(db, "organizationSettings", "transporterSettings");
      await updateDoc(settingsRef, {
        docks: updatedDocks,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      });
      
      toast({
        title: "Dock Added",
        description: `${newDockItem.name} has been added successfully.`
      });
    } catch (error) {
      console.error("Error saving new dock to Firebase:", error);
      // Revert the local state if save failed
      setDocks(docks);
      toast({
        title: "Error",
        description: "Failed to save the new dock. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Remove a dock
  const removeDock = async (dockId: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to remove docks.",
        variant: "destructive",
      });
      return;
    }
    
    // Get the dock name
    const dock = docks.find(d => d.id === dockId);
    if (!dock) return;
    
    // Check if dock is currently assigned to any truck
    if (assignedTrucks[dock.name] && assignedTrucks[dock.name] > 0) {
      toast({
        title: "Cannot Remove Dock",
        description: `This dock is currently assigned to ${assignedTrucks[dock.name]} truck(s).`,
        variant: "destructive",
      });
      return;
    }
    
    const updatedDocks = docks.filter(dock => dock.id !== dockId);
    
    try {
      setSaving(true);
      console.log("Removing dock and saving to Firebase:", dock);
      
      // Update local state
      setDocks(updatedDocks);
      
      // Save directly to Firestore
      const settingsRef = doc(db, "organizationSettings", "transporterSettings");
      await updateDoc(settingsRef, {
        docks: updatedDocks,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      });
      
      toast({
        title: "Dock Removed",
        description: `${dock.name} has been removed successfully.`
      });
    } catch (error) {
      console.error("Error removing dock from Firebase:", error);
      // Revert the local state if save failed
      setDocks(docks);
      toast({
        title: "Error",
        description: "Failed to remove the dock. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle dock serviceability
  const toggleDockServiceability = async (dockId: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to update dock settings.",
        variant: "destructive",
      });
      return;
    }
    
    const dock = docks.find(d => d.id === dockId);
    if (!dock) return;
    
    const updatedDocks = docks.map(dock => {
      if (dock.id === dockId) {
        return { ...dock, isServiceable: !dock.isServiceable };
      }
      return dock;
    });
    
    try {
      setSaving(true);
      console.log("Updating dock serviceability and saving to Firebase:", dock);
      
      // Update local state
      setDocks(updatedDocks);
      
      // Save directly to Firestore
      const settingsRef = doc(db, "organizationSettings", "transporterSettings");
      await updateDoc(settingsRef, {
        docks: updatedDocks,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      });
      
      const newStatus = !dock.isServiceable ? 'serviceable' : 'not serviceable';
      toast({
        title: "Dock Updated",
        description: `${dock.name} is now ${newStatus}.`
      });
    } catch (error) {
      console.error("Error updating dock serviceability in Firebase:", error);
      // Revert the local state if save failed
      setDocks(docks);
      toast({
        title: "Error",
        description: "Failed to update the dock. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Helper to show the current status
  const getStatusBadge = () => {
    if (loading) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 ml-2">
          <RefreshCw size={12} className="animate-spin mr-1" />
          Loading Data...
        </Badge>
      );
    }
    if (saving) {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 ml-2">
          <RefreshCw size={12} className="animate-spin mr-1" />
          Saving...
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h3 className="text-lg font-medium">Dock Management</h3>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={fetchDockSettings}
            className="flex items-center gap-1"
            disabled={loading || saving}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span>Refresh Data</span>
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={fetchTruckAssignments}
            className="flex items-center gap-1"
            disabled={loading || saving}
          >
            <RefreshCw size={16} />
            <span>Check Assignments</span>
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add New Dock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="new-dock" className="mb-1 block">Dock Name</Label>
                <Input
                  id="new-dock"
                  placeholder="Enter dock name"
                  value={newDock}
                  onChange={(e) => setNewDock(e.target.value)}
                />
              </div>
              <Button 
                onClick={addDock} 
                className="bg-ilp-navy hover:bg-ilp-navy/90 flex items-center gap-1"
              >
                <PlusCircle className="h-4 w-4" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Available Docks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ilp-navy"></div>
              </div>
            ) : docks.length === 0 ? (
              <div className="py-4 text-center text-gray-500">
                No docks available. Add docks using the form above.
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {docks.map((dock) => (
                  <div key={dock.id} className="flex items-center justify-between bg-white p-3 rounded border hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${dock.isServiceable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="font-medium">{dock.name}</span>
                      {assignedTrucks[dock.name] > 0 && (
                        <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-800 border-blue-200">
                          {assignedTrucks[dock.name]} truck{assignedTrucks[dock.name] > 1 ? 's' : ''} assigned
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={dock.isServiceable}
                        onCheckedChange={() => toggleDockServiceability(dock.id)}
                        disabled={saving}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removeDock(dock.id)}
                        disabled={saving || (assignedTrucks[dock.name] && assignedTrucks[dock.name] > 0)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// RoleAssignmentModal component
const RoleAssignmentModal = ({ 
  isOpen, 
  setIsOpen, 
  user, 
  onRoleAssign 
}: { 
  isOpen: boolean; 
  setIsOpen: (open: boolean) => void; 
  user: any; 
  onRoleAssign: (userId: string, role: string) => Promise<void>; 
}) => {
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || "USER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Reset selected role when user changes
  useEffect(() => {
    if (user) {
      setSelectedRole(user.role || "USER");
    }
  }, [user]);
  
  // Fetch roles from Firestore
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        
        // Get roles collection
        const rolesRef = collection(db, "roles");
        const rolesSnapshot = await getDocs(rolesRef);
        
        if (rolesSnapshot.empty) {
          // Fallback to default roles if none exist
          setRoles([
            { id: "ADMIN", name: "Admin", description: "Full system access with all privileges", color: "orange" },
            { id: "GATE", name: "Gate", description: "Manages entry/exit of vehicles at the gate", color: "blue" },
            { id: "WEIGHBRIDGE", name: "Weighbridge", description: "Handles weight measurement and verification", color: "purple" },
            { id: "DOCK", name: "Dock", description: "Manages loading/unloading operations at docks", color: "green" },
            { id: "USER", name: "Regular User", description: "Basic access with limited permissions", color: "gray" }
          ]);
        } else {
          // Parse roles from Firestore
          const rolesList: any[] = [];
          rolesSnapshot.forEach((doc) => {
            rolesList.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          setRoles(rolesList);
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
        // Fallback to default roles
        setRoles([
          { id: "ADMIN", name: "Admin", description: "Full system access with all privileges", color: "orange" },
          { id: "USER", name: "Regular User", description: "Basic access with limited permissions", color: "gray" }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);
  
  // Handle role assignment
  const handleRoleAssignment = async () => {
    if (!user || !selectedRole) return;
    
    try {
      setIsSubmitting(true);
      await onRoleAssign(user.id, selectedRole);
      setIsOpen(false);
    } catch (error) {
      console.error("Error assigning role:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get badge color based on role color
  const getRoleBadgeColor = (role: any) => {
    const colorMap: Record<string, string> = {
      'orange': "bg-orange-100 text-orange-800 border-orange-200",
      'blue': "bg-blue-100 text-blue-800 border-blue-200",
      'purple': "bg-purple-100 text-purple-800 border-purple-200",
      'green': "bg-green-100 text-green-800 border-green-200",
      'gray': "bg-gray-100 text-gray-800 border-gray-200",
      'red': "bg-red-100 text-red-800 border-red-200"
    };
    
    const roleObj = roles.find(r => r.id === role);
    if (roleObj && roleObj.color && colorMap[roleObj.color]) {
      return colorMap[roleObj.color];
    }
    
    return "bg-gray-100 text-gray-800 border-gray-200";
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Role</DialogTitle>
          <DialogDescription>
            {user && (
              <div className="flex items-center py-2 mt-2">
                <div className="h-10 w-10 flex-shrink-0 mr-3">
                  {user.photoURL ? (
                    <img 
                      className="h-10 w-10 rounded-full object-cover" 
                      src={user.photoURL} 
                      alt="" 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>';
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {loading ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ilp-navy"></div>
            </div>
          ) : (
            <RadioGroup value={selectedRole} onValueChange={setSelectedRole} className="gap-6">
              {roles.map((role) => (
                <div key={role.id} className="flex items-start space-x-2">
                  <RadioGroupItem value={role.id} id={role.id} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={role.id} className="flex items-center gap-2">
                      <span>{role.name}</span>
                      <Badge className={`${getRoleBadgeColor(role.id)} ml-2`}>
                        {role.id}
                      </Badge>
                    </Label>
                    <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRoleAssignment}
            disabled={isSubmitting || selectedRole === user?.role || loading}
            className={(selectedRole === user?.role || loading) ? "opacity-50 cursor-not-allowed" : ""}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Role"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// DeleteUserModal component
const DeleteUserModal = ({ 
  isOpen, 
  setIsOpen, 
  user, 
  onDeleteUser 
}: { 
  isOpen: boolean; 
  setIsOpen: (open: boolean) => void; 
  user: any; 
  onDeleteUser: (userId: string) => Promise<void>; 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      await onDeleteUser(user.id);
      setIsOpen(false);
    } catch (error) {
      console.error("Error deleting user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">Confirm User Deletion</DialogTitle>
          <DialogDescription>
            {user && (
              <div className="flex items-center py-2 mt-2">
                <div className="h-10 w-10 flex-shrink-0 mr-3">
                  {user.photoURL ? (
                    <img 
                      className="h-10 w-10 rounded-full object-cover" 
                      src={user.photoURL} 
                      alt="" 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>';
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium">Warning</h3>
                <div className="mt-2 text-sm">
                  <p>This action cannot be undone. This will permanently delete the user account and remove their data from our servers.</p>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-gray-700">
            Are you sure you want to delete this user? Please type <span className="font-semibold">delete</span> to confirm.
          </p>
          <Input 
            className="mt-2" 
            placeholder="Type 'delete' to confirm" 
            id="delete-confirmation"
            onChange={(e) => {
              const button = document.getElementById('confirm-delete-button') as HTMLButtonElement;
              if (button) {
                button.disabled = e.target.value !== 'delete' || isSubmitting;
              }
            }}
          />
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            id="confirm-delete-button"
            variant="destructive"
            onClick={handleDeleteUser}
            disabled={true}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete User"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// BanUserModal component
const BanUserModal = ({ 
  isOpen, 
  setIsOpen, 
  user, 
  onBanUser 
}: { 
  isOpen: boolean; 
  setIsOpen: (open: boolean) => void; 
  user: any; 
  onBanUser: (userId: string, banDuration: number) => Promise<void>; 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banDuration, setBanDuration] = useState(30); // Default to 30 days
  
  // Handle user ban
  const handleBanUser = async () => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      await onBanUser(user.id, banDuration);
      setIsOpen(false);
    } catch (error) {
      console.error("Error banning user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Available ban durations
  const banDurations = [
    { value: 1, label: "1 Day" },
    { value: 7, label: "7 Days" },
    { value: 14, label: "14 Days" },
    { value: 30, label: "30 Days" },
    { value: 60, label: "60 Days" },
    { value: 90, label: "90 Days" },
  ];
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-600">Temporarily Disable Account</DialogTitle>
          <DialogDescription>
            {user && (
              <div className="flex items-center py-2 mt-2">
                <div className="h-10 w-10 flex-shrink-0 mr-3">
                  {user.photoURL ? (
                    <img 
                      className="h-10 w-10 rounded-full object-cover" 
                      src={user.photoURL} 
                      alt="" 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>';
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-amber-50 text-amber-700 p-4 rounded-md mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium">Temporary Ban</h3>
                <div className="mt-2 text-sm">
                  <p>The user will be unable to access the system for the selected duration. Their account will be automatically reactivated after this period.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Label htmlFor="ban-duration" className="mb-2 block">Ban Duration</Label>
            <RadioGroup value={banDuration.toString()} onValueChange={(value) => setBanDuration(parseInt(value))} className="gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {banDurations.map((duration) => (
                  <div key={duration.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={duration.value.toString()} id={`duration-${duration.value}`} />
                    <Label htmlFor={`duration-${duration.value}`} className="cursor-pointer">
                      {duration.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-md border">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Summary:</span> {user?.displayName} will be banned until {' '}
                <span className="font-semibold">
                  {new Date(Date.now() + banDuration * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleBanUser}
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Disable Account"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// UserManagement component
const UserManagement = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<Record<string, boolean>>({});

  // Define user interface
  interface User {
    id: string;
    displayName?: string;
    email: string;
    role?: string;
    status?: string;
    lastLogin?: any;
    createdAt?: any;
    photoURL?: string;
    banExpiresAt?: any;
    banDuration?: number;
  }

  // Fetch users and roles on component mount
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // Format date safely
  const formatDate = (dateValue: any) => {
    if (!dateValue) return "N/A";
    
    try {
      // Handle Firestore timestamps
      if (typeof dateValue.toDate === 'function') {
        return format(dateValue.toDate(), "yyyy-MM-dd HH:mm");
      }
      
      // Handle string dates or timestamps
      return format(new Date(dateValue), "yyyy-MM-dd HH:mm");
    } catch (err) {
      console.error("Error formatting date:", err);
      return "Invalid date";
    }
  };

  // Fetch roles from Firestore
  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      
      // Get roles collection
      const rolesRef = collection(db, "roles");
      const rolesSnapshot = await getDocs(rolesRef);
      
      if (rolesSnapshot.empty) {
        // Initialize with default roles if no roles exist in Firestore
        setRoles([
          { id: "ADMIN", name: "Admin", color: "orange" },
          { id: "GATE", name: "Gate", color: "blue" },
          { id: "WEIGHBRIDGE", name: "Weighbridge", color: "purple" },
          { id: "DOCK", name: "Dock", color: "green" },
          { id: "USER", name: "User", color: "gray" }
        ]);
      } else {
        // Parse roles from Firestore
        const rolesList: any[] = [];
        rolesSnapshot.forEach((doc) => {
          rolesList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setRoles(rolesList);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      // Fallback to default roles on error
      setRoles([
        { id: "ADMIN", name: "Admin", color: "orange" },
        { id: "USER", name: "User", color: "gray" }
      ]);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Get role badge styling
  const getRoleBadge = (role: string = "USER") => {
    const roleObj = roles.find(r => r.id === role.toUpperCase());
    
    if (!roleObj) {
      return <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">{role || "USER"}</span>;
    }
    
    const colorMap: Record<string, string> = {
      'orange': "bg-orange-100 text-orange-800",
      'blue': "bg-blue-100 text-blue-800",
      'purple': "bg-purple-100 text-purple-800",
      'green': "bg-green-100 text-green-800",
      'gray': "bg-gray-100 text-gray-800",
      'red': "bg-red-100 text-red-800"
    };
    
    const bgColorClass = colorMap[roleObj.color] || "bg-gray-100 text-gray-800";
    
    return <span className={`px-2 py-1 text-xs font-medium rounded ${bgColorClass}`}>{roleObj.name}</span>;
  };

  // Fetch users from Firestore
  const fetchUsers = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Initialize users list
      let usersList: User[] = [];
      
      // 1. Try the users collection (custom collection where we store additional user data)
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      
      // Map of user IDs to track which users we've already processed
      const processedUserIds = new Set<string>();
      
      if (!usersSnapshot.empty) {
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          usersList.push({
            id: doc.id,
            displayName: userData.displayName || "Unnamed User",
            email: userData.email || "",
            role: userData.role || "USER",
            status: userData.disabled === true ? "inactive" : "active",
            lastLogin: userData.lastLoginAt || userData.lastSignInTime,
            createdAt: userData.createdAt || userData.metadata?.creationTime,
            photoURL: userData.photoURL,
            banExpiresAt: userData.banExpiresAt,
            banDuration: userData.banDuration
          });
          
          // Mark this user as processed
          processedUserIds.add(doc.id);
        });
      }
      
      // 2. Always include current user if they're not already in the list
      if (currentUser && !processedUserIds.has(currentUser.uid)) {
        // Add current user to the list with ADMIN role
        usersList.push({
          id: currentUser.uid,
          displayName: currentUser.displayName || "Current User",
          email: currentUser.email || "",
          role: "ADMIN", // Assign ADMIN role to the current user if no other role exists
          status: "active",
          lastLogin: new Date(),
          createdAt: currentUser.metadata?.creationTime || new Date(),
          photoURL: currentUser.photoURL,
          banExpiresAt: null,
          banDuration: null
        });
        
        // Save current user to the users collection for future reference
        try {
          const userRef = doc(db, "users", currentUser.uid);
          await setDoc(userRef, {
            displayName: currentUser.displayName,
            email: currentUser.email,
            role: "ADMIN",
            status: "active", 
            lastLogin: serverTimestamp(),
            createdAt: currentUser.metadata?.creationTime ? new Date(currentUser.metadata.creationTime) : serverTimestamp(),
            photoURL: currentUser.photoURL,
            providerId: currentUser.providerData?.[0]?.providerId || 'unknown'
          }, { merge: true });
          
          console.log("Saved current user to users collection");
        } catch (err) {
          console.error("Error saving user to collection:", err);
        }
      }
      
      setUsers(usersList);
      
      // Log the number of users found
      console.log(`Found ${usersList.length} real users`);
      
    } catch (err) {
      console.error("Error fetching users:", err);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add admin functionality to handle user role assignments
  const assignRole = async (userId: string, newRole: string) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        role: newRole,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser?.uid
      });

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, role: newRole }
          : user
      ));

      toast({
        title: "Role Updated",
        description: `User role has been successfully updated to ${newRole}`,
      });
    } catch (err) {
      console.error("Error updating user role:", err);
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      });
      throw err; // Re-throw for the modal to handle
    }
  };

  // Delete user functionality
  const deleteUser = async (userId: string) => {
    try {
      // Prevent deleting the current user
      if (userId === currentUser?.uid) {
        toast({
          title: "Cannot Delete",
          description: "You cannot delete your own account.",
          variant: "destructive",
        });
        return;
      }
      
      // Get reference to user document
      const userRef = doc(db, "users", userId);
      
      // Delete the user document
      await deleteDoc(userRef);

      // Update local state to remove the user
      setUsers(users.filter(user => user.id !== userId));

      toast({
        title: "User Deleted",
        description: "User has been successfully deleted.",
      });
    } catch (err) {
      console.error("Error deleting user:", err);
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
      throw err; // Re-throw for the modal to handle
    }
  };

  // Ban user functionality
  const banUser = async (userId: string, banDuration: number) => {
    try {
      // Prevent banning the current user
      if (userId === currentUser?.uid) {
        toast({
          title: "Cannot Ban",
          description: "You cannot ban your own account.",
          variant: "destructive",
        });
        return;
      }
      
      // Get reference to user document
      const userRef = doc(db, "users", userId);

      // Calculate ban expiration date
      const banExpiresAt = new Date();
      banExpiresAt.setDate(banExpiresAt.getDate() + banDuration);
      
      // Update user document with ban info
      await updateDoc(userRef, {
        status: "inactive",
        disabled: true,
        banReason: "Temporarily banned by administrator",
        banDuration: banDuration,
        banStartedAt: serverTimestamp(),
        banExpiresAt: banExpiresAt,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser?.uid
      });

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              status: "inactive", 
              banExpiresAt: banExpiresAt,
              banDuration: banDuration
            }
          : user
      ));

      toast({
        title: "Account Disabled",
        description: `User has been temporarily disabled for ${banDuration} days.`,
      });
    } catch (err) {
      console.error("Error banning user:", err);
      toast({
        title: "Error",
        description: "Failed to disable user account. Please try again.",
        variant: "destructive",
      });
      throw err; // Re-throw for the modal to handle
    }
  };

  // Reactivate a banned user
  const reactivateUser = async (userId: string) => {
    try {
      // Get reference to user document
      const userRef = doc(db, "users", userId);
      
      // Update user document to remove ban
      await updateDoc(userRef, {
        status: "active",
        disabled: false,
        banReason: null,
        banDuration: null,
        banStartedAt: null,
        banExpiresAt: null,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser?.uid
      });

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              status: "active", 
              banExpiresAt: null,
              banDuration: null
            }
          : user
      ));

      toast({
        title: "Account Reactivated",
        description: "User account has been successfully reactivated.",
      });
    } catch (err) {
      console.error("Error reactivating user:", err);
      toast({
        title: "Error",
        description: "Failed to reactivate user account. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Toggle action menu
  const toggleActionMenu = (userId: string) => {
    setActionMenuOpen(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Close all menus
  const closeAllMenus = () => {
    setActionMenuOpen({});
  };

  // Admin actions
  const handleUserAction = {
    edit: (user: any) => {
      setSelectedUser(user);
      setRoleModalOpen(true);
      closeAllMenus();
    },
    
    delete: (user: any) => {
      setSelectedUser(user);
      setDeleteModalOpen(true);
      closeAllMenus();
    },

    ban: (user: any) => {
      setSelectedUser(user);
      setBanModalOpen(true);
      closeAllMenus();
    },

    reactivate: (userId: string) => {
      if (window.confirm("Are you sure you want to reactivate this user account?")) {
        reactivateUser(userId);
      }
      closeAllMenus();
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (user.role?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  return (
    <div className="space-y-6">
      {/* Search and refresh */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchUsers}
          disabled={loading}
          className="flex gap-1 items-center"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>No users found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 mr-3">
                        {user.photoURL ? (
                          <img 
                            className="h-10 w-10 rounded-full object-cover" 
                            src={user.photoURL} 
                            alt=""
                            onError={(e) => {
                              // Handle image load errors by replacing with fallback
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>';
                            }} 
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.banExpiresAt && (
                          <div className="text-xs text-amber-600 mt-1">
                            Disabled until: {new Date(user.banExpiresAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center">
                      <span className={`h-2.5 w-2.5 rounded-full mr-2 ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="text-sm capitalize">{user.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.lastLogin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="relative">
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleUserAction.edit(user)}
                          disabled={user.id === currentUser?.uid && user.role === 'ADMIN'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-600 hover:text-blue-800">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleActionMenu(user.id)}
                          disabled={user.id === currentUser?.uid}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-600 hover:text-gray-800">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                          </svg>
                        </Button>
                      </div>
                      
                      {/* Action menu dropdown */}
                      {actionMenuOpen[user.id] && (
                        <div 
                          className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 py-1 border"
                          onBlur={() => setActionMenuOpen(prev => ({ ...prev, [user.id]: false }))}
                        >
                          {user.status === 'active' ? (
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 flex items-center"
                              onClick={() => handleUserAction.ban(user)}
                              disabled={user.id === currentUser?.uid}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                              </svg>
                              Disable Temporarily
                            </button>
                          ) : (
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center"
                              onClick={() => handleUserAction.reactivate(user.id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                              </svg>
                              Reactivate Account
                            </button>
                          )}
                          <hr className="my-1" />
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                            onClick={() => handleUserAction.delete(user)}
                            disabled={user.id === currentUser?.uid}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete User
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Role Assignment Modal */}
      <RoleAssignmentModal 
        isOpen={roleModalOpen}
        setIsOpen={setRoleModalOpen}
        user={selectedUser}
        onRoleAssign={assignRole}
      />
      
      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={deleteModalOpen}
        setIsOpen={setDeleteModalOpen}
        user={selectedUser}
        onDeleteUser={deleteUser}
      />
      
      {/* Ban User Modal */}
      <BanUserModal
        isOpen={banModalOpen}
        setIsOpen={setBanModalOpen}
        user={selectedUser}
        onBanUser={banUser}
      />
    </div>
  );
};

// RoleManagement component
const RoleManagement = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [editedRoleName, setEditedRoleName] = useState("");
  const [editedRoleDescription, setEditedRoleDescription] = useState("");
  const [editedPageAccess, setEditedPageAccess] = useState<Record<string, boolean>>({});
  const [isAddingRole, setIsAddingRole] = useState(false);

  // Available application pages
  const availablePages = [
    { id: "dashboard", name: "Dashboard", description: "Main dashboard overview" },
    { id: "truck-entry", name: "Truck Entry", description: "Truck entry and registration" },
    { id: "transporter-collaboration", name: "Transporter Collaboration", description: "Manage transporters collaboration" },
    { id: "shift-handover", name: "Shift Handover", description: "Handle shift changes and handovers" },
    { id: "weigh-bridge", name: "Weigh Bridge", description: "Manage weight measurements" },
    { id: "dock", name: "Dock", description: "Dock management and operations" },
    { id: "exit", name: "Exit", description: "Manage truck exit process" },
    { id: "settings", name: "Settings", description: "System settings and configuration" },
    { id: "profile", name: "Profile", description: "User profile management" }
  ];

  // Fetch roles on component mount
  useEffect(() => {
    fetchRoles();
  }, []);

  // Fetch roles from Firestore
  const fetchRoles = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Get roles collection
      const rolesRef = collection(db, "roles");
      const rolesSnapshot = await getDocs(rolesRef);
      
      if (rolesSnapshot.empty) {
        // Initialize with default roles if no roles exist
        const defaultRoles = [
          {
            id: "ADMIN",
            name: "Admin",
            description: "Full system access with all privileges",
            color: "orange",
            permissions: ["all"],
            pageAccess: {
              "dashboard": true,
              "truck-entry": true,
              "transporter-collaboration": true,
              "shift-handover": true,
              "weigh-bridge": true,
              "dock": true,
              "exit": true,
              "settings": true,
              "profile": true
            },
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid
          },
          {
            id: "GATE",
            name: "Gate",
            description: "Manages truck entry and exit at the gates",
            color: "blue",
            permissions: ["truck_entry", "gate_processing"],
            pageAccess: {
              "dashboard": true,
              "truck-entry": true,
              "exit": true,
              "shift-handover": true,
              "profile": true
            },
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid
          },
          {
            id: "WEIGHBRIDGE",
            name: "Weighbridge",
            description: "Handles weight measurements and verifications",
            color: "purple",
            permissions: ["weighbridge_processing"],
            pageAccess: {
              "dashboard": true,
              "weigh-bridge": true,
              "shift-handover": true,
              "profile": true
            },
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid
          },
          {
            id: "DOCK",
            name: "Dock",
            description: "Manages loading/unloading operations at docks",
            color: "green",
            permissions: ["dock_processing"],
            pageAccess: {
              "dashboard": true,
              "dock": true,
              "exit": true,
              "shift-handover": true,
              "profile": true
            },
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid
          },
          {
            id: "USER",
            name: "User",
            description: "Basic access with limited permissions",
            color: "gray",
            permissions: ["view"],
            pageAccess: {
              "dashboard": true,
              "profile": true
            },
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid
          }
        ];
        
        // Add default roles to Firestore
        for (const role of defaultRoles) {
          await setDoc(doc(db, "roles", role.id), role);
        }
        
        setRoles(defaultRoles);
      } else {
        // Parse roles from Firestore
        const rolesList: any[] = [];
        rolesSnapshot.forEach((doc) => {
          rolesList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setRoles(rolesList);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast({
        title: "Error",
        description: "Failed to load roles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new role
  const handleAddRole = async () => {
    if (!currentUser) return;
    
    try {
      if (!newRoleName.trim()) {
        toast({
          title: "Error",
          description: "Role name is required.",
          variant: "destructive",
        });
        return;
      }
      
      // Generate role ID from name (uppercase, no spaces)
      const roleId = newRoleName.toUpperCase().replace(/\s+/g, "_");
      
      // Check if role ID already exists
      const roleExists = roles.some(role => role.id === roleId);
      if (roleExists) {
        toast({
          title: "Error",
          description: "A role with this name already exists.",
          variant: "destructive",
        });
        return;
      }
      
      setIsAddingRole(true);
      
      // Default page access - only dashboard and profile
      const defaultPageAccess: Record<string, boolean> = {
        "dashboard": true,
        "profile": true
      };
      
      // Create new role object
      const newRole = {
        id: roleId,
        name: newRoleName,
        description: newRoleDescription || "No description provided",
        color: "gray", // Default color
        permissions: ["view"], // Default permission
        pageAccess: defaultPageAccess,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };
      
      // Add role to Firestore
      await setDoc(doc(db, "roles", roleId), newRole);
      
      // Update local state
      setRoles([...roles, { ...newRole, createdAt: new Date() }]);
      
      // Reset form
      setNewRoleName("");
      setNewRoleDescription("");
      
      toast({
        title: "Success",
        description: `Role "${newRoleName}" has been created.`,
      });
    } catch (error) {
      console.error("Error adding role:", error);
      toast({
        title: "Error",
        description: "Failed to create role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingRole(false);
    }
  };

  // Open edit role dialog
  const openEditDialog = (role: any) => {
    setSelectedRole(role);
    setEditedRoleName(role.name);
    setEditedRoleDescription(role.description);
    
    // Initialize page access for editing
    const initialPageAccess: Record<string, boolean> = {};
    availablePages.forEach(page => {
      initialPageAccess[page.id] = role.pageAccess?.[page.id] === true;
    });
    
    setEditedPageAccess(initialPageAccess);
    setEditDialogOpen(true);
  };

  // Handle role update
  const handleUpdateRole = async () => {
    if (!currentUser || !selectedRole) return;
    
    try {
      if (!editedRoleName.trim()) {
        toast({
          title: "Error",
          description: "Role name is required.",
          variant: "destructive",
        });
        return;
      }
      
      // For ADMIN role, ensure all pages are accessible
      let finalPageAccess = { ...editedPageAccess };
      if (selectedRole.id === "ADMIN") {
        availablePages.forEach(page => {
          finalPageAccess[page.id] = true;
        });
      }
      
      // Update role in Firestore
      const roleRef = doc(db, "roles", selectedRole.id);
      await updateDoc(roleRef, {
        name: editedRoleName,
        description: editedRoleDescription || "No description provided",
        pageAccess: finalPageAccess,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      });
      
      // Update local state
      setRoles(roles.map(role => 
        role.id === selectedRole.id 
          ? { 
              ...role, 
              name: editedRoleName, 
              description: editedRoleDescription || "No description provided",
              pageAccess: finalPageAccess,
              updatedAt: new Date(),
              updatedBy: currentUser.uid
            }
          : role
      ));
      
      // Close dialog
      setEditDialogOpen(false);
      
      toast({
        title: "Success",
        description: `Role "${editedRoleName}" has been updated.`,
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update role. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Toggle page access in edit dialog
  const togglePageAccess = (pageId: string) => {
    setEditedPageAccess(prev => ({
      ...prev,
      [pageId]: !prev[pageId]
    }));
  };

  // Open delete role dialog
  const openDeleteDialog = (role: any) => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
  };

  // Handle role deletion
  const handleDeleteRole = async () => {
    if (!currentUser || !selectedRole) return;
    
    try {
      // Protect system roles from deletion
      if (["ADMIN", "USER"].includes(selectedRole.id)) {
        toast({
          title: "Cannot Delete",
          description: "System roles cannot be deleted.",
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        return;
      }
      
      // Check if role is assigned to any users
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", selectedRole.id));
      const usersSnapshot = await getDocs(q);
      
      if (!usersSnapshot.empty) {
        toast({
          title: "Cannot Delete",
          description: `This role is assigned to ${usersSnapshot.size} user(s). Please reassign users before deleting.`,
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        return;
      }
      
      // Delete role from Firestore
      await deleteDoc(doc(db, "roles", selectedRole.id));
      
      // Update local state
      setRoles(roles.filter(role => role.id !== selectedRole.id));
      
      // Close dialog
      setDeleteDialogOpen(false);
      
      toast({
        title: "Success",
        description: `Role "${selectedRole.name}" has been deleted.`,
      });
    } catch (error) {
      console.error("Error deleting role:", error);
      toast({
        title: "Error",
        description: "Failed to delete role. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get role badge styling
  const getRoleBadge = (role: any) => {
    const colors: Record<string, string> = {
      "orange": "bg-orange-100 text-orange-800",
      "blue": "bg-blue-100 text-blue-800",
      "purple": "bg-purple-100 text-purple-800",
      "green": "bg-green-100 text-green-800",
      "gray": "bg-gray-100 text-gray-800",
      "red": "bg-red-100 text-red-800"
    };
    
    const badgeClass = colors[role.color] || colors.gray;
    return <span className={`px-2 py-1 text-xs font-medium rounded ${badgeClass}`}>{role.name}</span>;
  };

  // Get page access badge
  const getPageAccessBadge = (role: any, pageId: string) => {
    const hasAccess = role.pageAccess?.[pageId] === true;
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        hasAccess ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-400"
      }`}>
        {hasAccess ? "Yes" : "No"}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ilp-navy"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Add Role Form */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-medium mb-4">Create New Role</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="newRoleName">Role Name</Label>
            <Input
              id="newRoleName"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Enter role name"
              className="mt-1"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="newRoleDescription">Description</Label>
            <Input
              id="newRoleDescription"
              value={newRoleDescription}
              onChange={(e) => setNewRoleDescription(e.target.value)}
              placeholder="Enter role description"
              className="mt-1"
            />
          </div>
        </div>
        <Button 
          onClick={handleAddRole} 
          className="mt-4 bg-ilp-navy hover:bg-ilp-navy/90"
          disabled={isAddingRole || !newRoleName.trim()}
        >
          {isAddingRole ? (
            <>
              <span className="mr-2">Adding...</span>
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            </>
          ) : (
            <>Add Role</>
          )}
        </Button>
      </div>

      {/* Roles List */}
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">System Roles</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Page Access
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(role)}
                    <span className="block text-xs text-gray-500 mt-1">{role.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{role.description}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {role.id === "ADMIN" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          Full Access
                        </span>
                      ) : (
                        <div className="grid grid-cols-2 gap-1">
                          {availablePages.slice(0, 4).map((page) => (
                            <div key={page.id} className="flex items-center gap-1">
                              <span className="text-xs">{page.name}:</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                role.pageAccess?.[page.id] === true ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-400"
                              }`}>
                                {role.pageAccess?.[page.id] === true ? "Yes" : "No"}
                              </span>
                            </div>
                          ))}
                          {role.pageAccess && Object.keys(role.pageAccess).length > 4 && (
                            <div className="col-span-2 mt-1">
                              <span className="text-xs text-blue-500 cursor-pointer" onClick={() => openEditDialog(role)}>
                                + {Object.keys(role.pageAccess).length - 4} more
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {role.createdAt && typeof role.createdAt.toDate === 'function' 
                      ? format(role.createdAt.toDate(), "yyyy-MM-dd") 
                      : role.createdAt 
                        ? format(new Date(role.createdAt), "yyyy-MM-dd")
                        : "N/A"
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button 
                        onClick={() => openEditDialog(role)} 
                        size="sm" 
                        variant="outline"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {["ADMIN", "USER"].includes(role.id) ? "View" : "Edit"}
                      </Button>
                      {!["ADMIN", "USER"].includes(role.id) && (
                        <Button 
                          onClick={() => openDeleteDialog(role)} 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {roles.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No roles found</p>
          </div>
        )}
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRole?.id === 'ADMIN' ? 'View Admin Role' : 'Edit Role'}</DialogTitle>
            <DialogDescription>
              {selectedRole?.id === 'ADMIN' 
                ? 'Admin role has full access to all pages and features. Some settings cannot be modified.'
                : 'Customize role name, description, and page access permissions.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editRoleName">Role Name</Label>
                <Input
                  id="editRoleName"
                  value={editedRoleName}
                  onChange={(e) => setEditedRoleName(e.target.value)}
                  placeholder="Enter role name"
                  disabled={["ADMIN", "USER"].includes(selectedRole?.id || "")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRoleDescription">Description</Label>
                <Input
                  id="editRoleDescription"
                  value={editedRoleDescription}
                  onChange={(e) => setEditedRoleDescription(e.target.value)}
                  placeholder="Enter role description"
                  disabled={["ADMIN", "USER"].includes(selectedRole?.id || "")}
                />
              </div>
            </div>
            
            {/* Page Access Permission Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Page Access Permissions</Label>
                {selectedRole?.id !== 'ADMIN' && (
                  <div className="flex gap-2 text-xs">
                    <Badge className="bg-green-100 text-green-800">Has Access</Badge>
                    <Badge className="bg-gray-100 text-gray-400">No Access</Badge>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availablePages.map((page) => (
                  <div 
                    key={page.id} 
                    className={`flex items-start space-x-3 p-3 rounded-md ${
                      editedPageAccess[page.id] ? "bg-green-50" : "bg-gray-50"
                    }`}
                  >
                    <Switch
                      checked={editedPageAccess[page.id] || false}
                      onCheckedChange={() => togglePageAccess(page.id)}
                      disabled={selectedRole?.id === 'ADMIN' || (page.id === 'dashboard' || page.id === 'profile')}
                      id={`page-access-${page.id}`}
                    />
                    <div className="space-y-1">
                      <Label 
                        htmlFor={`page-access-${page.id}`}
                        className="font-medium"
                      >
                        {page.name}
                        {(page.id === 'dashboard' || page.id === 'profile') && (
                          <span className="ml-2 text-xs text-blue-500">(Required)</span>
                        )}
                      </Label>
                      <p className="text-xs text-gray-500">{page.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateRole}
              disabled={["ADMIN"].includes(selectedRole?.id || "")}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Are you sure you want to delete the role "{selectedRole?.name}"? This action cannot be undone.
            </p>
            {["ADMIN", "USER"].includes(selectedRole?.id || "") && (
              <p className="text-red-600 mt-4">
                System roles cannot be deleted.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteRole}
              disabled={["ADMIN", "USER"].includes(selectedRole?.id || "")}
            >
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Settings = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingApprovals, setLoadingApprovals] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [depots, setDepots] = useState<string[]>([]);
  const [transporters, setTransporters] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [newDepot, setNewDepot] = useState("");
  const [newTransporter, setNewTransporter] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  
  // Safety equipment inventory
  const [wheelChokeCount, setWheelChokeCount] = useState(0);
  const [safetyShoeCount, setSafetyShoeCount] = useState(0);
  const [issuedWheelChokes, setIssuedWheelChokes] = useState(0);
  const [issuedSafetyShoes, setIssuedSafetyShoes] = useState(0);

  useEffect(() => {
    if (currentUser) {
      fetchTransporterSettings();
      fetchApprovalRequests();
      fetchSafetyEquipmentInventory();
    }
  }, [currentUser]);

  const fetchTransporterSettings = async () => {
    if (!currentUser) return;
    
    try {
      // Get organization settings doc (in a real app, you might have org ID)
      const settingsRef = doc(db, "organizationSettings", "transporterSettings");
      const settingsSnapshot = await getDoc(settingsRef);
      
      if (settingsSnapshot.exists()) {
        const data = settingsSnapshot.data();
        setDepots(data.depots || []);
        setTransporters(data.transporters || []);
        setSuppliers(data.suppliers || []);
      } else {
        // Initialize with default values if no settings exist
        await setDoc(settingsRef, {
          depots: ["Depot A", "Depot B", "Depot C", "Depot D"],
          transporters: ["Transporter 1", "Transporter 2", "Transporter 3"],
          suppliers: ["Supplier A", "Supplier B", "Supplier C", "Supplier D"]
        });
        
        setDepots(["Depot A", "Depot B", "Depot C", "Depot D"]);
        setTransporters(["Transporter 1", "Transporter 2", "Transporter 3"]);
        setSuppliers(["Supplier A", "Supplier B", "Supplier C", "Supplier D"]);
      }
    } catch (error) {
      console.error("Error fetching transporter settings: ", error);
      toast({
        title: "Error loading settings",
        description: "Failed to load transporter settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchApprovalRequests = async () => {
    if (!currentUser) return;
    
    try {
      setLoadingApprovals(true);
      // Get approval requests from Firestore
      const approvalsRef = collection(db, "approvalRequests");
      const approvalsQuery = query(approvalsRef, where("status", "in", ["pending", "approved", "rejected"]));
      const approvalsSnapshot = await getDocs(approvalsQuery);
      
      const requests: ApprovalRequest[] = [];
      approvalsSnapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        } as ApprovalRequest);
      });
      
      setApprovalRequests(requests);
    } catch (error) {
      console.error("Error fetching approval requests: ", error);
      toast({
        title: "Error loading approvals",
        description: "Failed to load approval requests.",
        variant: "destructive",
      });
    } finally {
      setLoadingApprovals(false);
    }
  };
  
  const fetchSafetyEquipmentInventory = async () => {
    if (!currentUser) return;
    
    try {
      const settingsRef = doc(db, "settings", "safetyEquipment");
      const docSnap = await getDoc(settingsRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        setWheelChokeCount(data.wheelChokeCount || 0);
        setSafetyShoeCount(data.safetyShoeCount || 0);
        setIssuedWheelChokes(data.issuedWheelChokes || 0);
        setIssuedSafetyShoes(data.issuedSafetyShoes || 0);
      } else {
        // Initialize with default values if document doesn't exist
        await setDoc(settingsRef, {
          wheelChokeCount: 500,
          safetyShoeCount: 300,
          issuedWheelChokes: 0,
          issuedSafetyShoes: 0,
          lastUpdatedAt: serverTimestamp(),
          lastUpdatedBy: currentUser.uid
        });
        
        setWheelChokeCount(500);
        setSafetyShoeCount(300);
        setIssuedWheelChokes(0);
        setIssuedSafetyShoes(0);
      }
    } catch (error) {
      console.error("Error fetching safety equipment inventory:", error);
      toast({
        title: "Error",
        description: "Failed to load safety equipment inventory data.",
        variant: "destructive",
      });
    }
  };
  
  const handleSaveChanges = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save settings.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Get the organization settings document
      const settingsRef = doc(db, "organizationSettings", "transporterSettings");
      const settingsSnapshot = await getDoc(settingsRef);
      
      // Prepare update data
      const updateData: Record<string, any> = {
        depots,
        transporters,
        suppliers,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      };
      
      // Keep existing docks if available
      if (settingsSnapshot.exists()) {
        const currentData = settingsSnapshot.data();
        if (currentData.docks) {
          updateData.docks = currentData.docks;
        }
      }
      
      // Update transporter settings
      await setDoc(settingsRef, updateData, { merge: true });
      
      // Update safety equipment inventory
      const safetyEquipmentRef = doc(db, "settings", "safetyEquipment");
      await setDoc(safetyEquipmentRef, {
        wheelChokeCount,
        safetyShoeCount,
        issuedWheelChokes,
        issuedSafetyShoes,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      });
      
      // We don't need to manually call saveDockSettings since the dock settings 
      // are already saved when added/removed/updated, and the main save button 
      // just saves the general settings
      
      toast({
        title: "Settings Saved",
        description: "Your settings have been successfully updated.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const addItem = async (
    items: string[],
    setItems: React.Dispatch<React.SetStateAction<string[]>>,
    newItem: string,
    setNewItem: React.Dispatch<React.SetStateAction<string>>,
    fieldName: string
  ) => {
    if (newItem.trim() !== "" && !items.includes(newItem.trim())) {
      try {
        const newItems = [...items, newItem.trim()];
        
        // Update local state first
        setItems(newItems);
        setNewItem("");
        
        // Update Firestore
        const settingsRef = doc(db, "organizationSettings", "transporterSettings");
        await updateDoc(settingsRef, {
          [fieldName]: newItems,
          lastUpdatedAt: serverTimestamp(),
          lastUpdatedBy: currentUser?.uid
        });
      } catch (error) {
        console.error(`Error adding ${fieldName}: `, error);
        toast({
          title: "Error adding item",
          description: `Failed to add new ${fieldName.slice(0, -1)}.`,
          variant: "destructive",
        });
      }
    }
  };
  
  const removeItem = async (
    items: string[],
    setItems: React.Dispatch<React.SetStateAction<string[]>>,
    itemToRemove: string,
    fieldName: string
  ) => {
    try {
      const updatedItems = items.filter(item => item !== itemToRemove);
      
      // Update local state first
      setItems(updatedItems);
      
      // Update Firestore
      const settingsRef = doc(db, "organizationSettings", "transporterSettings");
      await updateDoc(settingsRef, {
        [fieldName]: updatedItems,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser?.uid
      });
    } catch (error) {
      console.error(`Error removing ${fieldName}: `, error);
      toast({
        title: "Error removing item",
        description: `Failed to remove ${fieldName.slice(0, -1)}.`,
        variant: "destructive",
      });
    }
  };
  
  // Handle approval actions
  const handleApproval = async (approvalId: string, truckId: string, action: "approved" | "rejected") => {
    if (!currentUser) return;
    
    try {
      // Get the approval request
      const approvalRef = doc(db, "approvalRequests", approvalId);
      const approvalSnap = await getDoc(approvalRef);
      
      if (!approvalSnap.exists()) {
        throw new Error("Approval request not found");
      }
      
      const approvalData = approvalSnap.data() as ApprovalRequest;
      
      // Update approval request status
      await updateDoc(approvalRef, {
        status: action,
        decidedBy: currentUser.uid,
        decidedAt: serverTimestamp()
      });
      
      // Update truck processing data based on request type
      const truckRef = doc(db, "transporterCollaborations", truckId);
      
      if (approvalData.requestType === "weightDiscrepancy") {
        // Handle weight discrepancy approval
        if (action === "approved") {
          await updateDoc(truckRef, {
            "weightData.approvalStatus": "approved",
            "weightData.approvedAt": serverTimestamp(),
            "weightData.approvedBy": currentUser.uid,
            "weightData.withinThreshold": false,
            weighbridgeProcessingComplete: true,
            weighbridgeProcessedAt: serverTimestamp(),
            weighbridgeProcessedBy: currentUser.uid,
            lastUpdatedAt: serverTimestamp(),
            lastUpdatedBy: currentUser.uid
          });
        } else {
          // If rejected, mark as rejected but don't complete
          await updateDoc(truckRef, {
            "weightData.approvalStatus": "rejected",
            "weightData.rejectedAt": serverTimestamp(),
            "weightData.rejectedBy": currentUser.uid,
            "weightData.withinThreshold": false,
            lastUpdatedAt: serverTimestamp(),
            lastUpdatedBy: currentUser.uid
          });
        }
      } else {
        // Handle document verification approval (original functionality)
        if (action === "approved") {
          await updateDoc(truckRef, {
            "processingDraft.exceptionallyApproved": true,
            "processingDraft.pendingApproval": false,
            "processingDraft.documentsVerified": true
          });
        } else {
          // If rejected, just mark as not pending
          await updateDoc(truckRef, {
            "processingDraft.pendingApproval": false
          });
        }
      }
      
      // Update local state
      setApprovalRequests(prev => 
        prev.map(req => 
          req.id === approvalId 
            ? { ...req, status: action } 
            : req
        )
      );
      
      toast({
        title: action === "approved" ? "Approved" : "Rejected",
        description: `The approval request has been ${action}.`,
      });
      
      // Refresh the approval requests to ensure UI is up-to-date
      await fetchApprovalRequests();
      
    } catch (error) {
      console.error(`Error ${action} approval: `, error);
      toast({
        title: "Error",
        description: `Failed to ${action} the approval request.`,
        variant: "destructive",
      });
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ilp-navy"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-7xl py-10">
      <h1 className="text-3xl font-bold text-ilp-navy mb-6">Settings</h1>
      
      <Tabs defaultValue="transporter" className="w-full">
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="transporter" className="flex gap-1 items-center">
            <Truck className="w-4 h-4" />
              <span>Transporter</span> 
            </TabsTrigger>
          <TabsTrigger value="truckManagement" className="flex gap-1 items-center">
            <ShieldCheck className="w-4 h-4" />
            <span>Truck Management</span>
            </TabsTrigger>
          <TabsTrigger value="weighbridge" className="flex gap-1 items-center">
            <Scale className="w-4 h-4" />
              <span>Weighbridge</span>
            </TabsTrigger>
          <TabsTrigger value="dock" className="flex gap-1 items-center">
            <Warehouse className="w-4 h-4" />
            <span>Dock</span>
            </TabsTrigger>
          <TabsTrigger value="users" className="flex gap-1 items-center">
            <Users className="w-4 h-4" />
            <span>Users</span>
            </TabsTrigger>
          <TabsTrigger value="roles" className="flex gap-1 items-center">
            <Shield className="w-4 h-4" />
            <span>Roles</span>
            </TabsTrigger>
          <TabsTrigger value="tat" className="flex gap-1 items-center">
            <Clock className="w-4 h-4" />
            <span>TAT</span>
            </TabsTrigger>
          <TabsTrigger value="safetyEquipment" className="flex gap-1 items-center">
            <HardHat className="w-4 h-4" />
            <span>Safety Equipment</span>
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex gap-1 items-center">
            <ShieldAlert className="w-4 h-4" />
            <span>Approvals</span>
            </TabsTrigger>
          <TabsTrigger value="feedback" className="flex gap-1 items-center">
            <MessageSquare className="w-4 h-4" />
            <span>Feedback</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="transporter">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Transporter Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Depots Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Depots</h3>
                
                <div className="flex gap-2">
                  <Input 
                    value={newDepot}
                    onChange={(e) => setNewDepot(e.target.value)}
                    placeholder="Add new depot"
                  />
                  <Button 
                    type="button" 
                    onClick={() => addItem(depots, setDepots, newDepot, setNewDepot, "depots")}
                    size="icon"
                  >
                    <PlusCircle size={18} />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {depots.map((depot) => (
                    <div key={depot} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span>{depot}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(depots, setDepots, depot, "depots")}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Transporters Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Transporters</h3>
                
                <div className="flex gap-2">
                  <Input 
                    value={newTransporter}
                    onChange={(e) => setNewTransporter(e.target.value)}
                    placeholder="Add new transporter"
                  />
                  <Button 
                    type="button" 
                    onClick={() => addItem(transporters, setTransporters, newTransporter, setNewTransporter, "transporters")}
                    size="icon"
                  >
                    <PlusCircle size={18} />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {transporters.map((transporter) => (
                    <div key={transporter} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span>{transporter}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(transporters, setTransporters, transporter, "transporters")}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Suppliers Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Suppliers</h3>
                
                <div className="flex gap-2">
                  <Input 
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    placeholder="Add new supplier"
                  />
                  <Button 
                    type="button" 
                    onClick={() => addItem(suppliers, setSuppliers, newSupplier, setNewSupplier, "suppliers")}
                    size="icon"
                  >
                    <PlusCircle size={18} />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {suppliers.map((supplier) => (
                    <div key={supplier} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span>{supplier}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(suppliers, setSuppliers, supplier, "suppliers")}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="truckManagement">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Truck Management</h2>
            <p className="text-gray-600 mb-6">Manage trucks in the system - view, delete, or restore trucks.</p>
            
            <TruckManagement />
          </div>
        </TabsContent>
        
        <TabsContent value="weighbridge">
          <WeighbridgeSettings />
        </TabsContent>
        
        <TabsContent value="dock">
          <DockSettings />
        </TabsContent>
        
        <TabsContent value="users">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <p className="text-gray-600 mb-6">Manage users and their access to the system.</p>
            
            <UserManagement />
          </div>
        </TabsContent>
        
        <TabsContent value="roles">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Role Management</h2>
            <p className="text-gray-600 mb-6">Create, edit, and delete roles to manage user permissions in the system.</p>
            
            <RoleManagement />
          </div>
        </TabsContent>
        
        <TabsContent value="tat">
          <TATSettings />
        </TabsContent>
        
        <TabsContent value="safetyEquipment">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Safety Equipment Inventory</h2>
            <p className="text-gray-600 mb-6">Manage safety equipment inventory and track distribution.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Wheel Chokes</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="wheelChokeCount">Total Inventory:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="wheelChokeCount"
                        type="number"
                        value={wheelChokeCount}
                        onChange={(e) => setWheelChokeCount(parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-24"
                      />
                      <span className="text-gray-500">units</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="issuedWheelChokes">Issued:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="issuedWheelChokes"
                        type="number"
                        value={issuedWheelChokes}
                        onChange={(e) => setIssuedWheelChokes(parseInt(e.target.value) || 0)}
                        min="0"
                        max={wheelChokeCount}
                        className="w-24"
                      />
                      <span className="text-gray-500">units</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-medium">Available:</span>
                    <span className="font-medium text-green-600">{wheelChokeCount - issuedWheelChokes}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Safety Shoes</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="safetyShoeCount">Total Inventory:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="safetyShoeCount"
                        type="number"
                        value={safetyShoeCount}
                        onChange={(e) => setSafetyShoeCount(parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-24"
                      />
                      <span className="text-gray-500">pairs</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="issuedSafetyShoes">Issued:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="issuedSafetyShoes"
                        type="number"
                        value={issuedSafetyShoes}
                        onChange={(e) => setIssuedSafetyShoes(parseInt(e.target.value) || 0)}
                        min="0"
                        max={safetyShoeCount}
                        className="w-24"
                      />
                      <span className="text-gray-500">pairs</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-medium">Available:</span>
                    <span className="font-medium text-green-600">{safetyShoeCount - issuedSafetyShoes}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 bg-blue-50 p-4 rounded-md border border-blue-200">
              <div className="flex gap-2">
                <div className="text-blue-600">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Safety Equipment Inventory Management</h4>
                  <p className="text-sm text-blue-700">
                    Keep track of your safety equipment inventory to ensure compliance with safety regulations.
                    Update the counts as equipment is issued to drivers or returned to inventory.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="approvals">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Approval Management</h2>
            <p className="text-gray-600 mb-6">Manage approval requests for document exceptions and weight discrepancies.</p>
            
            {loadingApprovals ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : approvalRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShieldAlert className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No approval requests found.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pending Approvals */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Pending Approvals</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {approvalRequests
                      .filter(req => req.status === "pending")
                      .map(request => (
                        <Card key={request.id} className="border-amber-200">
                          <CardHeader className={`${request.requestType === "weightDiscrepancy" ? "bg-orange-50 border-b border-orange-100" : "bg-amber-50 border-b border-amber-100"}`}>
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base font-medium flex items-center gap-2">
                                {request.requestType === "weightDiscrepancy" ? 
                                  <Scale className="h-4 w-4" /> : 
                                  <ShieldAlert className="h-4 w-4" />
                                }
                                {request.vehicleNumber || request.truckNumber}
                              </CardTitle>
                              <div className="flex gap-2 items-center">
                                <Badge className={request.requestType === "weightDiscrepancy" ? "bg-orange-500" : "bg-amber-500"}>
                                  {request.requestType === "weightDiscrepancy" ? "Weight Discrepancy" : "Document Exception"}
                                </Badge>
                                <Badge className="bg-amber-500">Pending</Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              {/* Common fields */}
                              <div>
                                <p className="text-sm text-gray-500">Truck ID</p>
                                <p className="font-medium">{request.truckNumber || request.vehicleNumber}</p>
                              </div>
                              
                              {/* Driver name (might not exist for weight discrepancy) */}
                              {request.driverName && (
                                <div>
                                  <p className="text-sm text-gray-500">Driver</p>
                                  <p className="font-medium">{request.driverName}</p>
                                </div>
                              )}
                              
                              <div>
                                <p className="text-sm text-gray-500">Requested On</p>
                                <p className="font-medium">
                                  {request.requestedAt ? format(new Date(request.requestedAt.toDate()), "PPpp") : "N/A"}
                                </p>
                              </div>
                              
                              {/* Weight discrepancy specific fields */}
                              {request.requestType === "weightDiscrepancy" && (
                                <>
                                  <div className="grid grid-cols-2 gap-2 p-3 bg-orange-50 rounded-md">
                                    <div>
                                      <p className="text-xs text-gray-500">Invoice Weight</p>
                                      <p className="font-medium">{request.invoiceWeight?.toLocaleString()} kg</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Average Weight</p>
                                      <p className="font-medium">{request.averageWeight?.toLocaleString() || request.actualWeight?.toLocaleString()} kg</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Difference</p>
                                      <p className="font-medium">{request.difference?.toLocaleString()} kg</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Percentage</p>
                                      <p className="font-medium text-orange-600">{request.percentageDiff}%</p>
                                    </div>
                                  </div>
                                  {request.weightCount && request.totalWeight && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                      <span className="text-gray-500">Total Weight: </span>
                                      <span className="font-medium">{request.totalWeight.toLocaleString()} kg</span>
                                      <span className="text-gray-500 ml-2">Weight Count: </span>
                                      <span className="font-medium">{request.weightCount}</span>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs text-gray-500">Exceeds Threshold</p>
                                    <p className="text-sm">Exceeds allowable threshold of {request.threshold}%</p>
                                  </div>
                                </>
                              )}
                              
                              <div>
                                <p className="text-sm text-gray-500">Reason</p>
                                <p className="text-sm">{request.reason || "No reason provided"}</p>
                              </div>
                              
                              <div className="flex gap-2 pt-2">
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700" 
                                  onClick={() => handleApproval(request.id, request.truckId, "approved")}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-red-300 text-red-600 hover:bg-red-50" 
                                  onClick={() => handleApproval(request.id, request.truckId, "rejected")}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                  {approvalRequests.filter(req => req.status === "pending").length === 0 && (
                    <p className="text-gray-500 text-center py-4">No pending approvals</p>
                  )}
                </div>
                
                {/* Recently Processed */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Recently Processed</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Truck
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Requested By
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Requested On
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Details
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {approvalRequests
                          .filter(req => req.status !== "pending")
                          .map(request => (
                            <tr key={request.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <Badge className={request.requestType === "weightDiscrepancy" ? "bg-orange-100 text-orange-800" : "bg-amber-100 text-amber-800"}>
                                  {request.requestType === "weightDiscrepancy" ? 
                                    <span className="flex items-center gap-1"><Scale className="h-3 w-3" /> Weight</span> : 
                                    <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Document</span>
                                  }
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {request.vehicleNumber || request.truckNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                User ID: {request.requestedBy?.substring(0, 6)}...
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {request.requestedAt ? 
                                  format(new Date(request.requestedAt.toDate()), "P") : 
                                  "N/A"
                                }
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {request.requestType === "weightDiscrepancy" ? 
                                  <span>
                                    Avg: {request.averageWeight?.toLocaleString() || request.actualWeight?.toLocaleString()} kg
                                    <span className="ml-1 text-orange-600">(Diff: {request.percentageDiff}%)</span>
                                  </span> : 
                                  <span>{request.reason?.substring(0, 20)}...</span>
                                }
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge 
                                  className={request.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                                >
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {approvalRequests.filter(req => req.status !== "pending").length === 0 && (
                    <p className="text-gray-500 text-center py-4">No processed approvals</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={fetchApprovalRequests}
              >
                <RefreshCw size={14} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="feedback">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">User Feedback Management</h2>
            <p className="text-gray-600 mb-6">Review and respond to user feedback, suggestions, and bug reports.</p>
            
            <FeedbackList />
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Button onClick={handleSaveChanges} className="bg-ilp-navy hover:bg-ilp-navy/90">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// TATSettings component
const TATSettings = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // TAT settings state
  const [fgTAT, setFgTAT] = useState(180); // 3 hours in minutes as default
  const [rmTAT, setRmTAT] = useState(180); // 3 hours in minutes as default
  const [pmTAT, setPmTAT] = useState(180); // 3 hours in minutes as default
  const [defaultTAT, setDefaultTAT] = useState(180); // 3 hours in minutes as default
  
  // Warning threshold (percentage beyond ideal TAT to highlight as warning)
  const [warningThreshold, setWarningThreshold] = useState(20); // 20% default
  
  // Critical threshold (percentage beyond ideal TAT to highlight as critical)
  const [criticalThreshold, setCriticalThreshold] = useState(50); // 50% default

  // Fetch TAT settings on component mount
  useEffect(() => {
    fetchTATSettings();
  }, []);

  // Fetch TAT settings from Firestore
  const fetchTATSettings = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const settingsRef = doc(db, "organizationSettings", "tatSettings");
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        
        // Get TAT values with defaults if not set
        setFgTAT(data.fgTAT || 180);
        setRmTAT(data.rmTAT || 180);
        setPmTAT(data.pmTAT || 180);
        setDefaultTAT(data.defaultTAT || 180);
        
        // Get threshold values with defaults if not set
        setWarningThreshold(data.warningThreshold || 20);
        setCriticalThreshold(data.criticalThreshold || 50);
      }
    } catch (error) {
      console.error("Error fetching TAT settings:", error);
      toast({
        title: "Error",
        description: "Failed to load TAT settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save TAT settings
  const saveTATSettings = async () => {
    if (!currentUser) return;
    
    try {
      setSaving(true);
      
      // Validate inputs
      if (warningThreshold >= criticalThreshold) {
        toast({
          title: "Invalid Settings",
          description: "Warning threshold must be less than critical threshold.",
          variant: "destructive",
        });
        return;
      }
      
      // Ensure all TAT values are positive
      if (fgTAT <= 0 || rmTAT <= 0 || pmTAT <= 0 || defaultTAT <= 0) {
        toast({
          title: "Invalid Settings",
          description: "All TAT values must be greater than zero.",
          variant: "destructive",
        });
        return;
      }
      
      const settingsRef = doc(db, "organizationSettings", "tatSettings");
      
      await setDoc(settingsRef, {
        fgTAT: fgTAT,
        rmTAT: rmTAT,
        pmTAT: pmTAT,
        defaultTAT: defaultTAT,
        warningThreshold: warningThreshold,
        criticalThreshold: criticalThreshold,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      }, { merge: true });
      
      toast({
        title: "Settings Saved",
        description: "TAT settings have been updated successfully."
      });
    } catch (error) {
      console.error("Error saving TAT settings:", error);
      toast({
        title: "Error",
        description: "Failed to save TAT settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Format minutes to hours and minutes
  const formatMinutesToHM = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Turnaround Time (TAT) Settings</h2>
          <p className="text-gray-600">Configure the ideal turnaround times for different material types</p>
        </div>
        <Button 
          onClick={saveTATSettings}
          disabled={saving}
          className="flex items-center gap-1"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Changes</span>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Ideal Turnaround Times</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fgTAT" className="block mb-1">
                    FG Material (Finished Goods) - Current: {formatMinutesToHM(fgTAT)}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="fgTAT"
                      type="number"
                      value={fgTAT}
                      onChange={(e) => setFgTAT(parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-24"
                    />
                    <span className="text-gray-500">minutes</span>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="rmTAT" className="block mb-1">
                    RM Material (Raw Materials) - Current: {formatMinutesToHM(rmTAT)}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="rmTAT"
                      type="number"
                      value={rmTAT}
                      onChange={(e) => setRmTAT(parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-24"
                    />
                    <span className="text-gray-500">minutes</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pmTAT" className="block mb-1">
                    PM Material (Packaging Materials) - Current: {formatMinutesToHM(pmTAT)}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="pmTAT"
                      type="number"
                      value={pmTAT}
                      onChange={(e) => setPmTAT(parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-24"
                    />
                    <span className="text-gray-500">minutes</span>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="defaultTAT" className="block mb-1">
                    Default (Other Materials) - Current: {formatMinutesToHM(defaultTAT)}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="defaultTAT"
                      type="number"
                      value={defaultTAT}
                      onChange={(e) => setDefaultTAT(parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-24"
                    />
                    <span className="text-gray-500">minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">TAT Threshold Settings</h3>
            <p className="text-gray-600 mb-4">
              Configure when to highlight trucks that exceed the ideal turnaround time
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="warningThreshold" className="block mb-1">
                  Warning Threshold (% over ideal TAT)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="warningThreshold"
                    type="number"
                    value={warningThreshold}
                    onChange={(e) => setWarningThreshold(parseInt(e.target.value) || 0)}
                    min="1"
                    max="100"
                    className="w-24"
                  />
                  <span className="text-gray-500">%</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Trucks exceeding the ideal TAT by this percentage will be highlighted with yellow.
                </p>
              </div>
              
              <div>
                <Label htmlFor="criticalThreshold" className="block mb-1">
                  Critical Threshold (% over ideal TAT)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="criticalThreshold"
                    type="number"
                    value={criticalThreshold}
                    onChange={(e) => setCriticalThreshold(parseInt(e.target.value) || 0)}
                    min="1"
                    max="200"
                    className="w-24"
                  />
                  <span className="text-gray-500">%</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Trucks exceeding the ideal TAT by this percentage will be highlighted with red.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
            <div className="flex gap-2">
              <div className="text-blue-600">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-800">How it works</h4>
                <p className="text-sm text-blue-700">
                  The system will calculate the TAT for exited trucks as the time between arrival and exit. 
                  Trucks that exceed the ideal TAT for their material type will be highlighted in the Exit page 
                  according to the thresholds defined above.
                </p>
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button
              onClick={saveTATSettings}
              disabled={saving}
              className="flex items-center gap-1"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings; 