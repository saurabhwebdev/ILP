import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2, 
  XCircle, 
  Truck as TruckIcon,
  MoreVertical,
  LogIn,
  Pause,
  ParkingCircle,
  ParkingSquare,
  Scale
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
  nextMilestone?: string;
  processingData?: any;
  issuedWheelChoke?: any;
  issuedSafetyShoe?: any;
  dockAssigned?: string;
  dockStatus?: "pending" | "loading" | "unloading" | "complete";
  loadingStartedAt?: any;
  loadingCompletedAt?: any;
  truckNumber?: string;
  driverLicense?: string;
  lrNumber?: string;
  rtoCapacity?: string;
  loadingCapacity?: string;
  supplierName?: string;
  createdAt?: any;
  isTransshipment?: boolean;
  originalTruckInfo?: any;
  processingDraft?: any;
  processedAt?: any;
  processedBy?: string;
  weightData?: any;
  weighbridgeProcessingComplete?: boolean;
  entryStatus?: "allowed" | "held" | "external_parking";
  reasonForHold?: string;
  channelType?: "green" | "orange";
  plannedDestination?: string;
}

// Define Dock interface for managing dock settings
interface Dock {
  id: string;
  name: string;
  isServiceable: boolean;
}

type TruckStatus = "At Gate" | "Inside" | "Upcoming" | "Internal Parking";
type ActionType = "allow" | "hold" | "external" | "weighbridge";

const Dock = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  // Truck state
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<TruckStatus>("Upcoming");
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [transporterFilter, setTransporterFilter] = useState("all");
  const [materialTypeFilter, setMaterialTypeFilter] = useState("all");
  const [depotFilter, setDepotFilter] = useState("all");
  const [channelTypeFilter, setChannelTypeFilter] = useState("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Settings options
  const [transporters, setTransporters] = useState<string[]>([]);
  const [depots, setDepots] = useState<string[]>([]);
  
  // Action modals state
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [actionType, setActionType] = useState<ActionType>("allow");
  const [selectedDock, setSelectedDock] = useState("");
  const [holdReason, setHoldReason] = useState("");
  
  // Available docks state
  const [availableDocks, setAvailableDocks] = useState<Dock[]>([
    { id: "dock1", name: "Dock 1", isServiceable: true },
    { id: "dock2", name: "Dock 2", isServiceable: true },
    { id: "dock3", name: "Dock 3", isServiceable: true },
    { id: "dock4", name: "Dock 4", isServiceable: true },
    { id: "dock5", name: "Dock 5", isServiceable: true },
    { id: "dock6", name: "Dock 6", isServiceable: false },
    { id: "dock7", name: "Dock 7", isServiceable: true },
    { id: "dock8", name: "Dock 8", isServiceable: true },
    { id: "dock9", name: "Dock 9", isServiceable: true },
    { id: "dock10", name: "Dock 10", isServiceable: true },
  ]);

  // Fetch transporters and depots from settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsRef = doc(db, "organizationSettings", "transporterSettings");
        const settingsSnapshot = await getDoc(settingsRef);
        
        if (settingsSnapshot.exists()) {
          const data = settingsSnapshot.data();
          setDepots(data.depots || []);
          setTransporters(data.transporters || []);
          
          // If dock settings exist, load them
          if (data.docks) {
            setAvailableDocks(data.docks);
          }
        } else {
          // Default values if settings don't exist
          setDepots(["Depot A", "Depot B", "Depot C", "Depot D"]);
          setTransporters(["Transporter 1", "Transporter 2", "Transporter 3"]);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    
    // Fetch initial settings and truck data
    fetchSettings();
    // Also fetch the latest dock settings directly
    fetchDockSettings();
  }, []);

  // Fetch trucks based on active tab
  const fetchTrucks = async () => {
    setLoading(true);
    try {
      let trucksQuery;
      
      // Different queries based on tab
      if (activeTab === "At Gate") {
        trucksQuery = query(
          collection(db, "transporterCollaborations"),
          where("status", "==", "At Gate"),
          orderBy("arrivalDateTime")
        );
      } else if (activeTab === "Inside") {
        trucksQuery = query(
          collection(db, "transporterCollaborations"),
          where("status", "==", "Inside"),
          where("nextMilestone", "!=", "InternalParking"),
          orderBy("nextMilestone"),
          orderBy("arrivalDateTime")
        );
      } else if (activeTab === "Internal Parking") {
        trucksQuery = query(
          collection(db, "transporterCollaborations"),
          where("status", "==", "Inside"),
          where("nextMilestone", "==", "InternalParking"),
          orderBy("arrivalDateTime")
        );
      } else {
        // Upcoming tab
        trucksQuery = query(
          collection(db, "transporterCollaborations"),
          where("status", "==", "Upcoming"),
          orderBy("arrivalDateTime")
        );
      }
      
      const trucksSnapshot = await getDocs(trucksQuery);
      const fetchedTrucks: Truck[] = [];
      
      trucksSnapshot.forEach((doc) => {
        fetchedTrucks.push({
          id: doc.id,
          ...doc.data() as Omit<Truck, 'id'>
        } as Truck);
      });
      
      setTrucks(fetchedTrucks);
    } catch (error) {
      console.error("Error fetching trucks:", error);
      toast({
        title: "Error",
        description: "Could not fetch truck data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch trucks when active tab changes
  useEffect(() => {
    fetchTrucks();
  }, [activeTab]);
  
  // Format date for display
  const formatDate = (dateString: string | any) => {
    if (!dateString) return '';
    
    try {
      // Handle Firestore timestamp objects
      if (dateString.toDate && typeof dateString.toDate === 'function') {
        return format(dateString.toDate(), "PPpp");
      }
      
      // Handle string dates
      return format(new Date(dateString), "PPpp");
    } catch (error) {
      console.log("Date format error:", error);
      return String(dateString) || '';
    }
  };
  
  // Filter trucks
  const filteredTrucks = trucks.filter(truck => {
    const matchesSearch = 
      searchTerm === "" || 
      (truck.truckNumber && truck.truckNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      truck.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTransporter = transporterFilter === "all" || truck.transporter === transporterFilter;
    const matchesMaterialType = materialTypeFilter === "all" || truck.materialType === materialTypeFilter;
    const matchesDepot = depotFilter === "all" || truck.depotName === depotFilter;
    const matchesChannelType = channelTypeFilter === "all" || truck.channelType === channelTypeFilter;
    
    return matchesSearch && matchesTransporter && matchesMaterialType && matchesDepot && matchesChannelType;
  });
  
  // Paginate results
  const paginatedTrucks = filteredTrucks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalPages = Math.ceil(filteredTrucks.length / itemsPerPage);
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, transporterFilter, materialTypeFilter, depotFilter, channelTypeFilter]);
  
  // Get title based on active tab
  const getTabTitle = () => {
    const count = trucks.length;
    if (activeTab === "At Gate") {
      return `At Gate (${count})`;
    } else if (activeTab === "Inside") {
      return `Inside (${count})`;
    } else if (activeTab === "Internal Parking") {
      return `Internal Parking (${count})`;
    } else {
      return `Upcoming (${count})`;
    }
  };
  
  // Get action status text
  const getActionStatusText = (truck: Truck) => {
    if (truck.entryStatus === "allowed") return "Entry Allowed";
    if (truck.entryStatus === "held") return "Entry Held";
    if (truck.entryStatus === "external_parking") return "External Parking";
    return "Pending Action";
  };

  // Get action details for already taken actions
  const getActionDetails = (truck: Truck) => {
    if (truck.entryStatus === "allowed") {
      if (truck.plannedDestination === "Internal Parking") {
        return "Sent to Internal Parking";
      } else if (truck.dockAssigned) {
        return `Dock ${truck.dockAssigned} assigned`;
      }
      return "Entry allowed";
    }
    if (truck.entryStatus === "held") return "Entry held";
    if (truck.entryStatus === "external_parking") return "Sent to external parking";
    return "";
  };

  // Fetch dock settings from transporterSettings
  const fetchDockSettings = async () => {
    try {
      console.log("Dock.tsx: Fetching dock settings from transporterSettings");
      
      const settingsRef = doc(db, "organizationSettings", "transporterSettings");
      const settingsSnapshot = await getDoc(settingsRef);
      
      if (settingsSnapshot.exists()) {
        const data = settingsSnapshot.data();
        console.log("Dock.tsx: Retrieved transporterSettings data:", data);
        
        if (data.docks && Array.isArray(data.docks)) {
          console.log("Dock.tsx: Found dock settings in data:", data.docks);
          setAvailableDocks(data.docks);
        } else {
          console.log("Dock.tsx: No docks array in data, using defaults");
          // Use default docks if none found
          const defaultDocks = [
            { id: "dock1", name: "Dock 1", isServiceable: true },
            { id: "dock2", name: "Dock 2", isServiceable: true },
            { id: "dock3", name: "Dock 3", isServiceable: true },
            { id: "dock4", name: "Dock 4", isServiceable: true },
            { id: "dock5", name: "Dock 5", isServiceable: true }
          ];
          setAvailableDocks(defaultDocks);
        }
      } else {
        console.log("Dock.tsx: transporterSettings document does not exist");
        toast({
          title: "Warning",
          description: "Settings document not found. Using default dock settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Dock.tsx: Error fetching dock settings:", error);
      toast({
        title: "Error",
        description: "Could not fetch dock settings. Using existing settings.",
        variant: "destructive",
      });
    }
  };
  
  // Open action modal for a truck
  const openActionModal = (truck: Truck, action: ActionType) => {
    // Refresh dock settings before opening modal
    fetchDockSettings().then(() => {
      setSelectedTruck(truck);
      setActionType(action);
      setSelectedDock("");
      setHoldReason("");
      setActionModalOpen(true);
    });
  };

  // Handle action confirmation
  const handleActionConfirm = async () => {
    if (!selectedTruck || !currentUser) {
      toast({
        title: "Error",
        description: "Selected truck or user information is missing.",
        variant: "destructive",
      });
      return;
    }

    try {
      const truckRef = doc(db, "transporterCollaborations", selectedTruck.id);
      const updateData: any = {
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      };
      
      if (actionType === "allow") {
        if (!selectedDock) {
          toast({
            title: "Destination Required",
            description: "Please select a destination (dock or internal parking) to allow entry.",
            variant: "destructive",
          });
          return;
        }
        
        // Update truck for entry allowed - keeping status as "At Gate"
        updateData.entryStatus = "allowed";
        updateData.entryApprovedAt = serverTimestamp();
        updateData.entryApprovedBy = currentUser.uid;
        
        // If internal parking is selected
        if (selectedDock === "InternalParking") {
          updateData.nextMilestone = "InternalParking";
          updateData.plannedDestination = "Internal Parking";
        } else {
          // Validate that the selected dock exists and is serviceable
          const dockExists = availableDocks.some(
            dock => dock.name === selectedDock && dock.isServiceable
          );
          
          if (!dockExists) {
            toast({
              title: "Invalid Dock Selection",
              description: "The selected dock is no longer available or serviceable. Please select another dock.",
              variant: "destructive",
            });
            return;
          }
          
          updateData.dockAssigned = selectedDock;
          updateData.dockStatus = "pending";
          updateData.plannedDestination = selectedDock;
        }
      } 
      else if (actionType === "hold") {
        if (!holdReason) {
          toast({
            title: "Reason Required",
            description: "Please provide a reason for holding the entry.",
            variant: "destructive",
          });
          return;
        }
        
        // Update truck for held entry
        updateData.entryStatus = "held";
        updateData.reasonForHold = holdReason;
        updateData.heldAt = serverTimestamp();
        updateData.heldBy = currentUser.uid;
      }
      else if (actionType === "external") {
        // Update truck for external parking
        updateData.entryStatus = "external_parking";
        updateData.externalParkingAt = serverTimestamp();
        updateData.externalParkingBy = currentUser.uid;
      }
      else if (actionType === "weighbridge") {
        // Update truck to send to weighbridge
        updateData.nextMilestone = "WeighBridge";
        updateData.sentToWeighbridgeAt = serverTimestamp();
        updateData.sentToWeighbridgeBy = currentUser.uid;
      }
      
      await updateDoc(truckRef, updateData);
      
      const actionTexts = {
        allow: selectedDock === "InternalParking" 
              ? "Entry allowed and sent to Internal Parking" 
              : `Entry allowed and dock ${selectedDock} assigned`,
        hold: "Entry held",
        external: "Sent to external parking",
        weighbridge: "Sent to weighbridge"
      };
      
      toast({
        title: "Action Successful",
        description: `${actionTexts[actionType]} for truck ${selectedTruck.vehicleNumber}.`,
      });
      
      // Refresh the data by triggering a tab change to the current tab
      setActiveTab(prev => {
        // Using a temporary variable to force a re-render
        const temp = prev === "At Gate" ? "AtGateTemp" as any : "At Gate";
        setTimeout(() => setActiveTab(prev), 0);
        return temp as TruckStatus;
      });
      
      // Additional refresh for weighbridge action to immediately update the Internal Parking table
      if (actionType === "weighbridge") {
        setTimeout(() => {
          fetchTrucks();
        }, 500);
      }
      
      // Close the modal
      setActionModalOpen(false);
    } catch (error) {
      console.error("Error processing truck action:", error);
      toast({
        title: "Error",
        description: "Failed to process action. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get action button color based on status
  const getActionStatusColor = (truck: Truck) => {
    if (truck.entryStatus === "allowed") return "bg-green-100 text-green-800";
    if (truck.entryStatus === "held") return "bg-red-100 text-red-800";
    if (truck.entryStatus === "external_parking") return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };

  // Render the action modal
  const renderActionModal = () => {
    if (!selectedTruck) return null;
    
    return (
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "allow" ? "Allow Entry" : 
               actionType === "hold" ? "Hold Entry" : 
               actionType === "weighbridge" ? "Send to Weighbridge" :
               "Send to External Parking"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "allow" 
                ? "Allow truck entry and assign a destination (dock or internal parking)." 
                : actionType === "hold" 
                ? "Hold truck entry and provide a reason."
                : actionType === "weighbridge"
                ? "Send this truck from Internal Parking to the Weighbridge."
                : "Send truck to external parking area."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 bg-gray-50 rounded-md mb-4">
            <p className="text-sm font-medium">Truck: {selectedTruck.vehicleNumber}</p>
            <p className="text-sm text-gray-500">Driver: {selectedTruck.driverName}</p>
            <p className="text-sm text-gray-500">Transporter: {selectedTruck.transporter}</p>
          </div>
          
          {actionType === "allow" && (
            <div className="space-y-3">
              <Label htmlFor="destination-type">Select Destination</Label>
              <Select 
                value={selectedDock === "InternalParking" ? "internal-parking" : "dock"} 
                onValueChange={(value) => {
                  if (value === "internal-parking") {
                    setSelectedDock("InternalParking");
                  } else {
                    setSelectedDock("");
                  }
                }}
              >
                <SelectTrigger id="destination-type">
                  <SelectValue placeholder="Choose destination type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dock">Assign to Dock</SelectItem>
                  <SelectItem value="internal-parking">Send to Internal Parking</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedDock !== "InternalParking" && (
                <>
                  <Label htmlFor="dock-select" className="mt-3">Select Dock</Label>
                  <Select value={selectedDock} onValueChange={setSelectedDock}>
                    <SelectTrigger id="dock-select">
                      <SelectValue placeholder="Choose a dock" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDocks
                        .filter(dock => dock.isServiceable)
                        .map(dock => (
                          <SelectItem key={dock.id} value={dock.name}>
                            {dock.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          )}
          
          {actionType === "hold" && (
            <div className="space-y-3">
              <Label htmlFor="hold-reason">Reason for Hold</Label>
              <Input
                id="hold-reason"
                placeholder="Enter reason for holding entry"
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
              />
            </div>
          )}
          
          {actionType === "external" && (
            <div className="p-4 bg-amber-50 rounded-md text-amber-800 text-sm">
              <p>Truck will be directed to external parking area.</p>
              <p>Please inform the driver about this decision.</p>
            </div>
          )}
          
          {actionType === "weighbridge" && (
            <div className="p-4 bg-blue-50 rounded-md text-blue-800 text-sm">
              <p>This truck will be sent from Internal Parking to the Weighbridge.</p>
              <p>After confirmation, it will appear in the Weighbridge table.</p>
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setActionModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleActionConfirm}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Render table content
  const renderTableContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ilp-navy"></div>
        </div>
      );
    }
    
    return (
      <>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Truck Number</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Number</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depot</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transporter</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weightment</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processing Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transshipment</th>
                {activeTab === "Inside" && (
                  <>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Milestone</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Safety Equipment</th>
                  </>
                )}
                {activeTab === "At Gate" && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Status</th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === "Inside" ? "Planned Dock/Internal Parking" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTrucks.length > 0 ? (
                paginatedTrucks.map((truck) => (
                  <tr key={truck.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        {truck.channelType === "green" ? (
                          <span className="font-medium text-green-600">{truck.truckNumber || 'N/A'}</span>
                        ) : truck.channelType === "orange" ? (
                          <span className="font-medium text-orange-600">{truck.truckNumber || 'N/A'}</span>
                        ) : (
                          <span className="text-gray-500">{truck.truckNumber || 'N/A'}</span>
                        )}
                        
                        {truck.channelType && (
                          <Badge 
                            className={`ml-2 ${
                              truck.channelType === "green" 
                                ? "bg-green-100 text-green-800 border border-green-200" 
                                : "bg-orange-100 text-orange-800 border border-orange-200"
                            }`}
                          >
                            {truck.channelType === "green" ? "Green" : "Orange"}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.driverName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.vehicleNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.driverMobile}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.depotName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.transporter}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(truck.arrivalDateTime)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.materialType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activeTab === "Inside" && truck.weightData ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full inline-flex items-center">
                            {Object.keys(truck.weightData).filter(key => key.startsWith('weight')).length} Weight(s) Recorded
                          </span>
                          
                          {/* Show only the weight entries */}
                          {Object.entries(truck.weightData)
                            .filter(([key]) => key.startsWith('weight'))
                            .map(([key, value]: [string, any]) => (
                              <div key={key} className="text-xs text-gray-600">
                                {key.replace('weight', '#')}: {value.weight} kg ({value.materialType})
                              </div>
                            ))
                          }
                          
                          {/* Processing status */}
                          {truck.weighbridgeProcessingComplete && (
                            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full mt-1">
                              Weightment Complete
                            </span>
                          )}
                          
                          {/* Invoice information */}
                          {truck.weightData.invoiceWeight && (
                            <div className="mt-1 text-xs text-gray-600">
                              <div>Invoice Weight: {truck.weightData.invoiceWeight} kg</div>
                              {truck.weightData.averageWeight && (
                                <div>Average Weight: {truck.weightData.averageWeight} kg</div>
                              )}
                              {truck.weightData.differencePercentage > 0 && (
                                <div className="text-orange-600">
                                  Difference: {truck.weightData.differencePercentage}%
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : activeTab === "Inside" ? (
                        <div className="flex items-center justify-center">
                          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full inline-flex items-center">
                            Pending Weightment
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${activeTab === "At Gate" ? "bg-blue-100 text-blue-800" : 
                          activeTab === "Inside" ? "bg-green-100 text-green-800" : 
                          "bg-yellow-100 text-yellow-800"}`}>
                        {truck.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {truck.processingData ? (
                        // Completed processing
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full inline-flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Processing Complete
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            {truck.processedAt ? formatDate(truck.processedAt) : ''}
                          </span>
                        </div>
                      ) : truck.processingDraft ? (
                        // In-progress processing
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full inline-flex items-center">
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            In Progress
                          </span>
                        </div>
                      ) : activeTab === "At Gate" ? (
                        // Not started processing
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full inline-flex items-center">
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Started
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {truck.isTransshipment ? (
                        <Badge 
                          variant="outline" 
                          className="bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer flex items-center gap-1"
                        >
                          <AlertTriangle size={12} />
                          Transshipped
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {activeTab === "Inside" && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {truck.nextMilestone ? (
                            <Badge className="bg-blue-100 text-blue-800">
                              {truck.nextMilestone}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {truck.issuedWheelChoke || truck.issuedSafetyShoe ? (
                            <div className="flex flex-col gap-1">
                              {truck.issuedWheelChoke && (
                                <Badge className="bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> 
                                  Wheel Chokes: {truck.issuedWheelChoke.quantity}
                                </Badge>
                              )}
                              {truck.issuedSafetyShoe && (
                                <Badge className="bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Safety Shoes: {truck.issuedSafetyShoe.quantity}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              Not Issued
                            </Badge>
                          )}
                        </td>
                      </>
                    )}
                    {activeTab === "At Gate" && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {truck.entryStatus ? (
                          <Badge className={getActionStatusColor(truck)}>
                            {getActionStatusText(truck)}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">
                            Pending Action
                          </Badge>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {activeTab === "At Gate" && (
                        <div className="flex items-center">
                          {truck.entryStatus && (
                            <span className="text-xs text-gray-500 mr-2">{getActionDetails(truck)}</span>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                className="h-8 w-8 p-0"
                                title={truck.entryStatus ? `Action already taken: ${getActionDetails(truck)}` : "Available actions"}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="cursor-pointer flex items-center"
                                onClick={() => openActionModal(truck, "allow")}
                                disabled={truck.entryStatus !== undefined}
                              >
                                <LogIn className="mr-2 h-4 w-4" />
                                <span>Allow Entry</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="cursor-pointer flex items-center"
                                onClick={() => openActionModal(truck, "hold")}
                                disabled={truck.entryStatus !== undefined}
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                <span>Hold Entry</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="cursor-pointer flex items-center"
                                onClick={() => openActionModal(truck, "external")}
                                disabled={truck.entryStatus !== undefined}
                              >
                                <ParkingCircle className="mr-2 h-4 w-4" />
                                <span>External Parking</span>
                              </DropdownMenuItem>
                              {truck.entryStatus && (
                                <div className="px-2 py-1 text-xs text-gray-500 border-t mt-1">
                                  Action already taken: {getActionDetails(truck)}
                                </div>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      {activeTab === "Inside" && (truck.plannedDestination || truck.dockAssigned) && (
                        <div className="text-sm">
                          {truck.plannedDestination === "Internal Parking" ? (
                            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                              <ParkingSquare className="h-3 w-3" />
                              Internal Parking
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                              <LogIn className="h-3 w-3" />
                              {truck.dockAssigned}
                            </Badge>
                          )}
                        </div>
                      )}
                      {activeTab === "Internal Parking" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="cursor-pointer flex items-center"
                              onClick={() => openActionModal(truck, "weighbridge")}
                            >
                              <Scale className="mr-2 h-4 w-4" />
                              <span>Send to Weighbridge</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {activeTab === "Upcoming" && (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activeTab === "Inside" ? 14 : activeTab === "At Gate" ? 14 : 13} className="px-6 py-4 text-center text-sm text-gray-500">
                    No trucks found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {filteredTrucks.length > itemsPerPage && (
          <Pagination className="py-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(old => Math.max(old - 1, 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                let pageNum = i + 1;
                
                // If there are more than 5 pages, show first, last, and pages around current
                if (totalPages > 5) {
                  if (currentPage <= 3) {
                    pageNum = i + 1;
                    if (i === 4) return (
                      <PaginationItem key={i}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                    if (i === 0) return (
                      <PaginationItem key={i}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  } else {
                    if (i === 0) return (
                      <PaginationItem key={i}>
                        <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
                      </PaginationItem>
                    );
                    if (i === 1) return (
                      <PaginationItem key={i}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                    if (i === 3) return (
                      <PaginationItem key={i}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                    if (i === 4) return (
                      <PaginationItem key={i}>
                        <PaginationLink onClick={() => setCurrentPage(totalPages)}>{totalPages}</PaginationLink>
                      </PaginationItem>
                    );
                    pageNum = currentPage + i - 2;
                  }
                }
                
                return (
                  <PaginationItem key={i}>
                    <PaginationLink
                      isActive={currentPage === pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(old => Math.min(old + 1, totalPages))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </>
    );
  };
  
  // Render filters
  const renderFilters = () => {
    return (
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search trucks..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={transporterFilter} onValueChange={setTransporterFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Transporter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transporters</SelectItem>
            {transporters.map((transporter) => (
              <SelectItem key={transporter} value={transporter}>{transporter}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={materialTypeFilter} onValueChange={setMaterialTypeFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Material Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Materials</SelectItem>
            <SelectItem value="FG">FG</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
            <SelectItem value="RM">RM</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={depotFilter} onValueChange={setDepotFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Depot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Depots</SelectItem>
            {depots.map((depot) => (
              <SelectItem key={depot} value={depot}>{depot}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={channelTypeFilter} onValueChange={setChannelTypeFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Channel Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="green">Green Channel</SelectItem>
            <SelectItem value="orange">Orange Channel</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          className="w-full md:w-auto" 
          onClick={() => {
            setSearchTerm("");
            setTransporterFilter("all");
            setMaterialTypeFilter("all");
            setDepotFilter("all");
            setChannelTypeFilter("all");
          }}
        >
          Clear Filters
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 md:px-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getTabTitle()}</h1>
            <p className="text-muted-foreground">
              Manage truck docking assignments and view truck statuses
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => fetchTrucks()}
            >
              <RefreshCw size={16} />
              <span>Refresh Trucks</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => fetchDockSettings()}
            >
              <RefreshCw size={16} />
              <span>Refresh Dock Settings</span>
            </Button>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as TruckStatus)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="At Gate" className="flex items-center gap-1">
              <TruckIcon size={16} />
              <span>At Gate</span>
            </TabsTrigger>
            <TabsTrigger value="Inside" className="flex items-center gap-1">
              <LogIn size={16} />
              <span>Inside</span>
            </TabsTrigger>
            <TabsTrigger value="Upcoming" className="flex items-center gap-1">
              <Pause size={16} />
              <span>Upcoming</span>
            </TabsTrigger>
            <TabsTrigger value="Internal Parking" className="flex items-center gap-1">
              <ParkingSquare size={16} />
              <span>Internal Parking</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="At Gate">
            {renderFilters()}
            {renderTableContent()}
          </TabsContent>
          
          <TabsContent value="Inside">
            {renderFilters()}
            {renderTableContent()}
          </TabsContent>
          
          <TabsContent value="Upcoming">
            {renderFilters()}
            {renderTableContent()}
          </TabsContent>
          
          <TabsContent value="Internal Parking">
            {renderFilters()}
            {renderTableContent()}
          </TabsContent>
        </Tabs>
        
        {/* Action Confirmation Modal */}
        {renderActionModal()}
      </div>
    </div>
  );
};

export default Dock; 