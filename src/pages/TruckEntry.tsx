import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs,
  query,
  orderBy,
  where,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
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
import { Search, Plus, RefreshCw, X, Truck, AlertTriangle, CheckCircle2, XCircle, Filter, FilterX } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import TruckReplacement from "@/components/TruckReplacement";
import TransshipmentDetails from "@/components/TransshipmentDetails";
import { Badge } from "@/components/ui/badge";
import TruckProcessingModal from "@/components/TruckProcessing/TruckProcessingModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Truck collaboration data type
interface TruckCollaboration {
  id: string;
  truckNumber: string;
  driverName: string;
  driverMobile: string;
  driverLicense: string;
  vehicleNumber: string;
  depotName: string;
  lrNumber: string;
  rtoCapacity: string;
  loadingCapacity: string;
  transporter: string;
  arrivalDateTime: string;
  materialType: string;
  supplierName: string;
  status: string;
  createdAt: any;
  isTransshipment?: boolean;
  originalTruckInfo?: any;
  processingDraft?: any;
  processingData?: any;
  processedAt?: any;
  processedBy?: string;
  weightData?: any;
  weighbridgeProcessingComplete?: boolean;
  issuedWheelChoke?: any;
  issuedSafetyShoe?: any;
  entryStatus?: "allowed" | "held" | "external_parking";
  reasonForHold?: string;
  dockAssigned?: string;
  dockStatus?: "pending" | "loading" | "unloading" | "complete";
  channelType?: "green" | "orange";
}

// Define OriginalTruckInfo type for transshipment details
interface OriginalTruckInfo {
  vehicleNumber: string;
  driverName: string;
  driverMobile: string;
  driverLicense: string;
  transporter: string;
  replacedAt: any;
  replacedBy: string;
  reasonForReplacement: string;
}

type TruckStatus = "At Gate" | "Inside" | "Upcoming";

const TruckEntry = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isTransshipmentDetailsOpen, setIsTransshipmentDetailsOpen] = useState(false);
  
  // Process truck confirmation dialog state
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<TruckCollaboration | null>(null);
  const [selectedOriginalTruckInfo, setSelectedOriginalTruckInfo] = useState<OriginalTruckInfo | null>(null);
  
  // New truck form state
  const [newTruck, setNewTruck] = useState({
    driverName: "",
    driverMobile: "",
    driverLicense: "",
    vehicleNumber: "",
    depotName: "",
    lrNumber: "",
    rtoCapacity: "",
    loadingCapacity: "",
    transporter: "",
    supplierName: "",
    gate: "",
  });
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<TruckStatus>("Upcoming");
  
  // Truck state
  const [trucks, setTrucks] = useState<TruckCollaboration[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [transporterFilter, setTransporterFilter] = useState("all");
  const [materialTypeFilter, setMaterialTypeFilter] = useState("all");
  const [depotFilter, setDepotFilter] = useState("all");
  
  // Settings options
  const [transporters, setTransporters] = useState<string[]>([]);
  const [depots, setDepots] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [gates, setGates] = useState<string[]>(["FG Gate", "PM Gate", "RM Gate"]); // Material type gates
  const materialTypes = ["FG", "PM", "RM"];
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Add state for truck processing modal
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  
  // Add state for viewing processing details
  const [isProcessingDetailsOpen, setIsProcessingDetailsOpen] = useState(false);
  const [selectedProcessingData, setSelectedProcessingData] = useState<any>(null);
  
  // Column-level filters state
  const [columnFilters, setColumnFilters] = useState<{
    [key: string]: string | null;
  }>({});
  
  // Fetch transporters, depots, and suppliers from settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsRef = doc(db, "organizationSettings", "transporterSettings");
        const settingsSnapshot = await getDoc(settingsRef);
        
        if (settingsSnapshot.exists()) {
          const data = settingsSnapshot.data();
          setDepots(data.depots || []);
          setTransporters(data.transporters || []);
          setSuppliers(data.suppliers || []);
        } else {
          // Default values if settings don't exist
          setDepots(["Depot A", "Depot B", "Depot C", "Depot D"]);
          setTransporters(["Transporter 1", "Transporter 2", "Transporter 3"]);
          setSuppliers(["Supplier A", "Supplier B", "Supplier C", "Supplier D"]);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    
    fetchSettings();
  }, []);
  
  // Fetch trucks based on active tab
  useEffect(() => {
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
            orderBy("arrivalDateTime")
          );
        } else { // Upcoming
          trucksQuery = query(
            collection(db, "transporterCollaborations"),
            where("status", "==", "Pending"),
            orderBy("arrivalDateTime")
          );
        }
        
        const snapshot = await getDocs(trucksQuery);
        const trucksData: TruckCollaboration[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<TruckCollaboration, "id">;
          
          // Make sure to include channelType in the truck data
          trucksData.push({
            id: doc.id,
            ...data,
            channelType: data.channelType || undefined
          });
        });
        
        setTrucks(trucksData);
      } catch (error) {
        console.error(`Error fetching ${activeTab} trucks: `, error);
        toast({
          title: "Error loading trucks",
          description: `Failed to load ${activeTab} trucks data.`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrucks();
    // Reset filters and pagination when tab changes
    setSearchTerm("");
    setTransporterFilter("all");
    setMaterialTypeFilter("all");
    setDepotFilter("all");
    setCurrentPage(1);
  }, [activeTab, toast]);
  
  // Handle adding a new truck
  const handleAddTruckSubmit = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to add a truck.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Validate required fields
      if (!newTruck.driverName || !newTruck.driverMobile || !newTruck.vehicleNumber || !newTruck.gate) {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }
      
      // Derive material type from gate
      let materialType = "RM"; // Default
      if (newTruck.gate.startsWith("FG")) {
        materialType = "FG";
      } else if (newTruck.gate.startsWith("PM")) {
        materialType = "PM";
      }
      
      // Create truck data
      const truckData = {
        truckNumber: newTruck.vehicleNumber,
        driverName: newTruck.driverName,
        driverMobile: newTruck.driverMobile,
        driverLicense: newTruck.driverLicense,
        vehicleNumber: newTruck.vehicleNumber,
        depotName: newTruck.depotName,
        lrNumber: newTruck.lrNumber,
        rtoCapacity: newTruck.rtoCapacity,
        loadingCapacity: newTruck.loadingCapacity,
        transporter: newTruck.transporter,
        arrivalDateTime: new Date().toISOString(),
        materialType: materialType,
        supplierName: newTruck.supplierName,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        status: "At Gate",
        gate: newTruck.gate
      };
      
      // Add to Firestore
      await addDoc(collection(db, "transporterCollaborations"), truckData);
      
      // Show success message
      toast({
        title: "Truck added",
        description: "The truck has been added successfully.",
      });
      
      // Reset form and close modal
      resetForm();
      setIsAddModalOpen(false);
      
      // Set active tab to "At Gate" to show the newly added truck
      setActiveTab("At Gate");
      
    } catch (error) {
      console.error("Error adding truck:", error);
      toast({
        title: "Error",
        description: "Failed to add truck. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewTruck(prev => ({ ...prev, [id]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (value: string, field: string) => {
    setNewTruck(prev => ({ ...prev, [field]: value }));
  };
  
  // Reset form
  const resetForm = () => {
    setNewTruck({
      driverName: "",
      driverMobile: "",
      driverLicense: "",
      vehicleNumber: "",
      depotName: "",
      lrNumber: "",
      rtoCapacity: "",
      loadingCapacity: "",
      transporter: "",
      supplierName: "",
      gate: "",
    });
  };
  
  // Show transshipment details
  const showTransshipmentDetails = (truck: TruckCollaboration) => {
    if (truck.originalTruckInfo) {
      setSelectedOriginalTruckInfo(truck.originalTruckInfo);
      setIsTransshipmentDetailsOpen(true);
    } else {
      toast({
        title: "No transshipment data",
        description: "Original truck information is not available.",
        variant: "destructive",
      });
    }
  };
  
  // Handle processing a truck from Upcoming to At Gate
  const handleProcessTruck = async () => {
    if (!selectedTruck || !currentUser) {
      toast({
        title: "Error",
        description: "Could not process the truck. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update the truck status in Firestore
      const truckRef = doc(db, "transporterCollaborations", selectedTruck.id);
      await updateDoc(truckRef, {
        status: "At Gate",
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      });

      // Show success message
      toast({
        title: "Success",
        description: "Truck has been processed and moved to At Gate.",
      });

      // Update the local trucks state to reflect the change without a refresh
      // Remove the truck from the current list
      setTrucks(prevTrucks => 
        prevTrucks.filter(truck => truck.id !== selectedTruck.id)
      );
      
      // Close the confirmation dialog
      setIsProcessModalOpen(false);
      setSelectedTruck(null);
    } catch (error) {
      console.error("Error processing truck:", error);
      toast({
        title: "Error",
        description: "Failed to process truck. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Open process truck confirmation dialog
  const openProcessDialog = (truck: TruckCollaboration) => {
    setSelectedTruck(truck);
    setIsProcessModalOpen(true);
  };
  
  // Handle moving a truck from At Gate back to Upcoming
  const handleMoveToUpcoming = async () => {
    if (!selectedTruck || !currentUser) {
      toast({
        title: "Error",
        description: "Could not move the truck. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update the truck status in Firestore
      const truckRef = doc(db, "transporterCollaborations", selectedTruck.id);
      await updateDoc(truckRef, {
        status: "Pending",
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      });

      // Show success message
      toast({
        title: "Success",
        description: "Truck has been moved to Upcoming list.",
      });

      // Update the local trucks state to reflect the change without a refresh
      // Remove the truck from the current list
      setTrucks(prevTrucks => 
        prevTrucks.filter(truck => truck.id !== selectedTruck.id)
      );
      
      // Close the confirmation dialog
      setIsProcessModalOpen(false);
      setSelectedTruck(null);
    } catch (error) {
      console.error("Error moving truck:", error);
      toast({
        title: "Error",
        description: "Failed to move truck. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Open truck replacement modal
  const openReplaceTruckModal = (truck: TruckCollaboration) => {
    setSelectedTruck(truck);
    setIsReplaceModalOpen(true);
  };
  
  // Handle successful truck replacement
  const handleTruckReplaced = () => {
    // Simply refresh the current tab data
    const currentActiveTab = activeTab;
    setActiveTab(activeTab === "At Gate" ? "Inside" : "At Gate"); // Switch to trigger refresh
    setTimeout(() => setActiveTab(currentActiveTab), 100); // Switch back after a small delay
  };
  
  // Open truck processing modal
  const openTruckProcessingModal = (truck: TruckCollaboration) => {
    setSelectedTruck(truck);
    setIsProcessingModalOpen(true);
  };
  
  // Handle successful truck processing
  const handleTruckProcessed = () => {
    // Remove the truck from At Gate list since it will be moved to Inside
    setTrucks(prevTrucks => 
      prevTrucks.filter(truck => truck.id !== selectedTruck?.id)
    );
    
    toast({
      title: "Success",
      description: "Truck processing completed successfully. Truck moved to Inside status.",
    });
  };
  
  // Open processing details dialog
  const openProcessingDetails = (truck: TruckCollaboration) => {
    if (truck.processingData) {
      setSelectedProcessingData(truck.processingData);
      setIsProcessingDetailsOpen(true);
    }
  };
  
  // Add a function to apply column filter
  const applyColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
    // Reset pagination when filters change
    setCurrentPage(1);
  };

  // Add a function to clear a specific column filter
  const clearColumnFilter = (column: string) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[column];
      return newFilters;
    });
    // Reset pagination when filters change
    setCurrentPage(1);
  };

  // Add a function to clear all column filters
  const clearAllColumnFilters = () => {
    setColumnFilters({});
    // Reset pagination when filters change
    setCurrentPage(1);
  };

  // Modify the existing filtering logic to include column filters
  const applyAllFilters = (truck: TruckCollaboration) => {
    // Basic search term filter
    const matchesSearch = 
      searchTerm === "" || 
      truck.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.transporter.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.driverMobile.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Dropdown filters
    const matchesTransporter = transporterFilter === "all" || truck.transporter === transporterFilter;
    const matchesMaterialType = materialTypeFilter === "all" || truck.materialType === materialTypeFilter;
    const matchesDepot = depotFilter === "all" || truck.depotName === depotFilter;
    
    // Column-level filters
    const matchesColumnFilters = Object.entries(columnFilters).every(([column, value]) => {
      if (!value) return true;
      
      // Special handling for certain columns
      if (column === 'status' || column === 'entryStatus' || column === 'channelType') {
        return truck[column as keyof TruckCollaboration] === value;
      }
      
      if (typeof truck[column as keyof TruckCollaboration] === 'string') {
        return (truck[column as keyof TruckCollaboration] as string).toLowerCase().includes(value.toLowerCase());
      }
      
      return true;
    });
    
    return matchesSearch && matchesTransporter && matchesMaterialType && matchesDepot && matchesColumnFilters;
  };
  
  // Replace the existing filtered trucks with the new one
  const filteredTrucks = trucks.filter(applyAllFilters);
  
  // Paginate results
  const paginatedTrucks = filteredTrucks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalPages = Math.ceil(filteredTrucks.length / itemsPerPage);
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, transporterFilter, materialTypeFilter, depotFilter]);
  
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
  
  // Get title based on active tab
  const getTabTitle = () => {
    switch(activeTab) {
      case "At Gate": return "Trucks At Gate";
      case "Inside": return "Trucks Inside Premises";
      case "Upcoming": return "Upcoming Trucks";
      default: return "Trucks";
    }
  };
  
  // Add a helper function to check if a truck can be processed
  const canProcessTruck = (truck: TruckCollaboration): boolean => {
    // Can only process trucks that have been allowed entry
    if (truck.status === "At Gate") {
      return truck.entryStatus === "allowed";
    }
    return true; // Other statuses don't need this check
  };

  // Add a helper function to get the entry status text and color
  const getEntryStatusInfo = (truck: TruckCollaboration) => {
    if (!truck.entryStatus) {
      return {
        text: "Pending Dock Assignment",
        color: "bg-gray-100 text-gray-800"
      };
    }
    
    if (truck.entryStatus === "allowed") {
      return {
        text: `Entry Allowed${truck.dockAssigned ? ` (${truck.dockAssigned})` : ''}`,
        color: "bg-green-100 text-green-800"
      };
    } else if (truck.entryStatus === "held") {
      return {
        text: "Entry Held",
        color: "bg-red-100 text-red-800"
      };
    } else if (truck.entryStatus === "external_parking") {
      return {
        text: "External Parking",
        color: "bg-orange-100 text-orange-800"
      };
    }
    
    return {
      text: "Unknown Status",
      color: "bg-gray-100 text-gray-800"
    };
  };
  
  // Helper function to get unique values for a column
  const getUniqueColumnValues = (column: keyof TruckCollaboration) => {
    const values = new Set<string>();
    
    trucks.forEach(truck => {
      if (truck[column] !== undefined && truck[column] !== null) {
        values.add(String(truck[column]));
      }
    });
    
    return Array.from(values).sort();
  };
  
  // Create column filter dropdown for a specific column
  const renderColumnFilter = (column: keyof TruckCollaboration, displayName: string) => {
    const uniqueValues = getUniqueColumnValues(column);
    const isFiltered = columnFilters[column as string] !== undefined;
    
    return (
      <div className="flex items-center gap-1">
        <span>{displayName}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={`h-5 w-5 p-0 ${isFiltered ? 'text-blue-600' : 'text-gray-400'}`}>
              {isFiltered ? <Filter size={14} /> : <Filter size={14} />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 max-h-80 overflow-y-auto">
            {isFiltered && (
              <DropdownMenuItem onClick={() => clearColumnFilter(column as string)}>
                <FilterX className="mr-2 h-4 w-4" />
                <span>Clear filter</span>
              </DropdownMenuItem>
            )}
            
            {uniqueValues.length > 0 ? (
              uniqueValues.map(value => (
                <DropdownMenuItem 
                  key={value} 
                  onClick={() => applyColumnFilter(column as string, value)}
                  className={columnFilters[column as string] === value ? 'bg-gray-100' : ''}
                >
                  {columnFilters[column as string] === value && (
                    <span className="mr-2">✓</span>
                  )}
                  <span className="truncate">{value}</span>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>No values available</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {renderColumnFilter('truckNumber', 'Truck Number')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {renderColumnFilter('driverName', 'Driver')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {renderColumnFilter('vehicleNumber', 'Vehicle Number')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {renderColumnFilter('driverMobile', 'Contact')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {renderColumnFilter('depotName', 'Depot')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {renderColumnFilter('transporter', 'Transporter')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span>Arrival Time</span>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {renderColumnFilter('materialType', 'Material')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span>Weightment</span>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {renderColumnFilter('status', 'Status')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span>Processing Status</span>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span>Transshipment</span>
                </th>
                {activeTab === "Inside" && (
                  <>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span>Next Milestone</span>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span>Safety Equipment</span>
                    </th>
                  </>
                )}
                {activeTab === "At Gate" && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {renderColumnFilter('entryStatus', 'Entry Status')}
                  </th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span>Action</span>
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
                          <span className="font-medium text-green-600">{truck.truckNumber}</span>
                        ) : truck.channelType === "orange" ? (
                          <span className="font-medium text-orange-600">{truck.truckNumber}</span>
                        ) : (
                          <span className="text-gray-500">{truck.truckNumber}</span>
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
                          
                          {/* Invoice number if present */}
                          {truck.weightData.invoiceNumber && (
                            <div className="text-xs text-gray-600">
                              Invoice #: {truck.weightData.invoiceNumber}
                            </div>
                          )}
                          
                          {/* Approval status badges */}
                          {truck.weightData.approvalStatus === "pending" && (
                            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full mt-1">
                              Approval Pending
                            </span>
                          )}
                          {truck.weightData.approvalStatus === "approved" && (
                            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full mt-1">
                              Discrepancy Approved
                            </span>
                          )}
                          {truck.weightData.approvalStatus === "rejected" && (
                            <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full mt-1">
                              Discrepancy Rejected
                            </span>
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
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
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
                            <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            In Progress
                          </span>
                          {/* Step 1: Document Check */}
                          <div className="flex items-center mt-1">
                            <div className={`w-2 h-2 rounded-full mr-1.5 ${truck.processingDraft.documentsVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                            <span className="text-xs text-gray-600">
                              {truck.processingDraft.documentsVerified ? "1. Document Check ✓" : "1. Document Check..."}
                            </span>
                          </div>
                          
                          {/* Step 2: Vehicle & Risk Check */}
                          <div className="flex items-center mt-1">
                            <div className={`w-2 h-2 rounded-full mr-1.5 ${
                              truck.processingDraft.vehicleConditionChecked ? 'bg-green-500' : 
                              truck.processingDraft.documentsVerified ? 'bg-yellow-500' : 'bg-gray-300'
                            }`}></div>
                            <span className="text-xs text-gray-600">
                              {truck.processingDraft.vehicleConditionChecked ? "2. Vehicle Check ✓" : 
                               truck.processingDraft.documentsVerified ? "2. Vehicle Check..." : "2. Vehicle Check"}
                            </span>
                          </div>
                          
                          {/* Step 3: Document Upload */}
                          <div className="flex items-center mt-1">
                            <div className={`w-2 h-2 rounded-full mr-1.5 ${
                              (truck.processingDraft.driverLicenseImage || 
                               truck.processingDraft.truckPermitImage || 
                               truck.processingDraft.insuranceImage) ? 'bg-green-500' : 
                              truck.processingDraft.vehicleConditionChecked ? 'bg-yellow-500' : 'bg-gray-300'
                            }`}></div>
                            <span className="text-xs text-gray-600">
                              {(truck.processingDraft.driverLicenseImage || 
                                truck.processingDraft.truckPermitImage || 
                                truck.processingDraft.insuranceImage) ? "3. Document Upload ✓" : 
                               truck.processingDraft.vehicleConditionChecked ? "3. Document Upload..." : "3. Document Upload"}
                            </span>
                          </div>
                          
                          {/* Step 4: Summary */}
                          <div className="flex items-center mt-1">
                            <div className={`w-2 h-2 rounded-full mr-1.5 ${
                              truck.processingDraft.processingCompleted ? 'bg-green-500' : 
                              (truck.processingDraft.driverLicenseImage || 
                               truck.processingDraft.truckPermitImage || 
                               truck.processingDraft.insuranceImage) ? 'bg-yellow-500' : 'bg-gray-300'
                            }`}></div>
                            <span className="text-xs text-gray-600">
                              {truck.processingDraft.processingCompleted ? "4. Summary ✓" : 
                               (truck.processingDraft.driverLicenseImage || 
                                truck.processingDraft.truckPermitImage || 
                                truck.processingDraft.insuranceImage) ? "4. Summary..." : "4. Summary"}
                            </span>
                          </div>          
                        </div>
                      ) : activeTab === "At Gate" ? (
                        // Not started processing
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full inline-flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
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
                          onClick={() => showTransshipmentDetails(truck)}
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
                          {truck.processingData?.nextMilestone ? (
                            <Badge className="bg-blue-100 text-blue-800">
                              {truck.processingData.nextMilestone}
                            </Badge>
                          ) : truck.weighbridgeProcessingComplete ? (
                            <Badge className="bg-green-100 text-green-800">
                              Unloading
                            </Badge>
                          ) : truck.processingData ? (
                            <Badge className="bg-purple-100 text-purple-800">
                              Weighbridge
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">
                              Processing
                            </Badge>
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
                        {(() => {
                          const { text, color } = getEntryStatusInfo(truck);
                          return (
                            <Badge className={color}>
                              {text}
                            </Badge>
                          );
                        })()}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        {activeTab === "Upcoming" && (
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => openProcessDialog(truck)}
                          >
                            Move to Gate
                          </Button>
                        )}
                        {activeTab === "At Gate" && (
                          <>
                            <Button 
                              size="sm" 
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={() => {
                                setSelectedTruck(truck);
                                setIsProcessModalOpen(true);
                              }}
                            >
                              To Upcoming
                            </Button>
                            <Button 
                              size="sm" 
                              className={`text-white ${canProcessTruck(truck) 
                                ? "bg-green-600 hover:bg-green-700" 
                                : "bg-gray-400 cursor-not-allowed"}`}
                              onClick={() => canProcessTruck(truck) && openTruckProcessingModal(truck)}
                              disabled={!canProcessTruck(truck)}
                              title={!canProcessTruck(truck) ? "Entry must be allowed in Dock Management first" : ""}
                            >
                              {truck.processingDraft ? 'Continue' : 'Process Truck'}
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => openReplaceTruckModal(truck)}
                            >
                              Replace
                            </Button>
                          </>
                        )}
                        {activeTab === "Inside" && (
                          <></>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activeTab === "Inside" ? 15 : activeTab === "At Gate" ? 14 : 13} className="px-6 py-4 text-center text-sm text-gray-500">
                    No trucks found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {filteredTrucks.length > 0 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink 
                        isActive={currentPage === pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {totalPages > 5 && (
                  <>
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(totalPages)}
                        isActive={currentPage === totalPages}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
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
            {materialTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
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
        
        <Select 
          value={columnFilters['channelType'] || 'all'} 
          onValueChange={(value) => value === 'all' 
            ? clearColumnFilter('channelType') 
            : applyColumnFilter('channelType', value)
          }
        >
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
          onClick={clearAllColumnFilters}
        >
          <FilterX className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      </div>
    );
  };
  
  // Handle Add Truck button click
  const handleAddTruck = () => {
    setIsAddModalOpen(true);
  };
  
  // Handle Replace Truck button click
  const handleReplaceTruck = () => {
    if (activeTab === "Upcoming") {
      toast({
        title: "Information",
        description: "Please select a truck from the At Gate or Inside tab to replace it.",
      });
      return;
    }
    
    // If no trucks are available, show a message
    if (trucks.length === 0) {
      toast({
        title: "No trucks available",
        description: "There are no trucks available to replace.",
        variant: "destructive",
      });
      return;
    }
    
    // If trucks exist, select the first one and open the replacement modal
    setSelectedTruck(trucks[0]);
    setIsReplaceModalOpen(true);
  };
  
  // Render processing details dialog
  const renderProcessingDetailsDialog = () => {
    if (!selectedProcessingData) return null;
    
    return (
      <Dialog open={isProcessingDetailsOpen} onOpenChange={setIsProcessingDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Truck Processing Details
            </DialogTitle>
            <DialogDescription>
              Processing information for truck {selectedProcessingData.vehicleNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 p-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Document Verification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Driver's License</p>
                  <p className="text-base">{selectedProcessingData.driverLicenseVerified ? "Verified ✓" : "Not Verified ✗"}</p>
                  {selectedProcessingData.driverLicenseValidUntil && (
                    <p className="text-xs text-gray-500">Valid until: {formatDate(selectedProcessingData.driverLicenseValidUntil)}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Registration Certificate</p>
                  <p className="text-base">{selectedProcessingData.truckPermitVerified ? "Verified ✓" : "Not Verified ✗"}</p>
                  {selectedProcessingData.truckPermitValidUntil && (
                    <p className="text-xs text-gray-500">Valid until: {formatDate(selectedProcessingData.truckPermitValidUntil)}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Insurance</p>
                  <p className="text-base">{selectedProcessingData.insuranceVerified ? "Verified ✓" : "Not Verified ✗"}</p>
                  {selectedProcessingData.insuranceValidUntil && (
                    <p className="text-xs text-gray-500">Valid until: {formatDate(selectedProcessingData.insuranceValidUntil)}</p>
                  )}
                </div>
                {selectedProcessingData.pollutionCertValidUntil && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pollution Certificate</p>
                    <p className="text-base">{new Date(selectedProcessingData.pollutionCertValidUntil) > new Date() ? "Valid ✓" : "Expired ✗"}</p>
                    <p className="text-xs text-gray-500">Valid until: {formatDate(selectedProcessingData.pollutionCertValidUntil)}</p>
                  </div>
                )}
              </div>
              {selectedProcessingData.documentRemarks && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-500">Remarks</p>
                  <p className="text-sm bg-white p-2 rounded border mt-1">{selectedProcessingData.documentRemarks}</p>
                </div>
              )}
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Vehicle Condition</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Tires Condition</p>
                  <p className="text-base capitalize">{selectedProcessingData.tiresCondition}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Lights Working</p>
                  <p className="text-base">{selectedProcessingData.lightsWorking ? "Yes ✓" : "No ✗"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Brakes Working</p>
                  <p className="text-base">{selectedProcessingData.brakesWorking ? "Yes ✓" : "No ✗"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Safety Equipment</p>
                  <p className="text-base">{selectedProcessingData.safetyEquipment ? "Present ✓" : "Missing ✗"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Risk Level</p>
                  <p className={`text-base font-medium ${
                    selectedProcessingData.riskLevel === 'low' ? 'text-green-600' : 
                    selectedProcessingData.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                  }`}>{selectedProcessingData.riskLevel.toUpperCase()}</p>
                </div>
              </div>
              {selectedProcessingData.vehicleRemarks && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-500">Remarks</p>
                  <p className="text-sm bg-white p-2 rounded border mt-1">{selectedProcessingData.vehicleRemarks}</p>
                </div>
              )}
            </div>
            
            {selectedProcessingData.finalRemarks && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Final Remarks</h3>
                <p className="text-sm bg-white p-2 rounded border">{selectedProcessingData.finalRemarks}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              onClick={() => setIsProcessingDetailsOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-ilp-navy mb-6">Truck Entry</h1>
      
      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Button 
          className="bg-ilp-navy hover:bg-ilp-navy/90 text-white flex items-center gap-2"
          onClick={handleAddTruck}
        >
          <Plus size={16} />
          Add Truck
        </Button>
        <Button 
          className="bg-ilp-burgundy hover:bg-ilp-burgundy/90 text-white flex items-center gap-2"
          onClick={handleReplaceTruck}
        >
          <RefreshCw size={16} />
          Replace Truck
        </Button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <Tabs defaultValue="upcoming" className="w-full" onValueChange={(value) => {
          if (value === "at-gate") setActiveTab("At Gate");
          else if (value === "inside") setActiveTab("Inside");
          else setActiveTab("Upcoming");
        }}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="at-gate">At Gate</TabsTrigger>
            <TabsTrigger value="inside">Inside Truck</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Truck</TabsTrigger>
          </TabsList>
          
          <TabsContent value="at-gate">
            <h2 className="text-xl font-bold text-ilp-navy mb-4">Trucks At Gate</h2>
            {renderFilters()}
            {renderTableContent()}
          </TabsContent>
          
          <TabsContent value="inside">
            <h2 className="text-xl font-bold text-ilp-navy mb-4">Trucks Inside Premises</h2>
            {renderFilters()}
            {renderTableContent()}
          </TabsContent>
          
          <TabsContent value="upcoming">
            <h2 className="text-xl font-bold text-ilp-navy mb-4">Upcoming Trucks</h2>
            {renderFilters()}
            {renderTableContent()}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Add Truck Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Truck</DialogTitle>
            <DialogDescription>
              Enter the truck details to add it to the gate.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="driverName">Driver Name</Label>
              <Input 
                id="driverName" 
                value={newTruck.driverName}
                onChange={handleInputChange}
                placeholder="Driver Name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="driverMobile">Driver Mobile Number</Label>
              <Input 
                id="driverMobile" 
                value={newTruck.driverMobile}
                onChange={handleInputChange}
                placeholder="Driver Mobile Number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="driverLicense">Driver License Number</Label>
              <Input 
                id="driverLicense" 
                value={newTruck.driverLicense}
                onChange={handleInputChange}
                placeholder="Driver License Number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vehicleNumber">Vehicle Number</Label>
              <Input 
                id="vehicleNumber" 
                value={newTruck.vehicleNumber}
                onChange={handleInputChange}
                placeholder="Vehicle Number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="depotName">Depot Name</Label>
              <Select
                value={newTruck.depotName}
                onValueChange={(value) => handleSelectChange(value, 'depotName')}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select depot" />
                </SelectTrigger>
                <SelectContent>
                  {depots.map((depot) => (
                    <SelectItem key={depot} value={depot}>{depot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lrNumber">LR Number</Label>
              <Input 
                id="lrNumber" 
                value={newTruck.lrNumber}
                onChange={handleInputChange}
                placeholder="LR Number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rtoCapacity">RTO Passing Capacity</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="rtoCapacity" 
                  value={newTruck.rtoCapacity}
                  onChange={handleInputChange}
                  placeholder="RTO Capacity"
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">(Tones)</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="loadingCapacity">Loading Capacity</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="loadingCapacity" 
                  value={newTruck.loadingCapacity}
                  onChange={handleInputChange}
                  placeholder="Loading Capacity"
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">(Tones)</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="transporter">Select Transporter</Label>
              <Select
                value={newTruck.transporter}
                onValueChange={(value) => handleSelectChange(value, 'transporter')}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select transporter" />
                </SelectTrigger>
                <SelectContent>
                  {transporters.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gate">Select Gate</Label>
              <Select
                value={newTruck.gate}
                onValueChange={(value) => handleSelectChange(value, 'gate')}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select gate" />
                </SelectTrigger>
                <SelectContent>
                  {gates.map((gate) => (
                    <SelectItem key={gate} value={gate}>{gate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supplierName">Supplier Name</Label>
              <Select
                value={newTruck.supplierName}
                onValueChange={(value) => handleSelectChange(value, 'supplierName')}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                resetForm();
                setIsAddModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              className="bg-ilp-navy hover:bg-ilp-navy/90 text-white"
              onClick={handleAddTruckSubmit}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Truck Confirmation Dialog */}
      <Dialog open={isProcessModalOpen} onOpenChange={setIsProcessModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeTab === "Upcoming" ? "Move Truck to Gate" : "Move Truck"}
            </DialogTitle>
            <DialogDescription>
              {activeTab === "Upcoming" 
                ? "Are you sure you want to process this truck and move it to the At Gate list?"
                : "Are you sure you want to move this truck back to the Upcoming list?"
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedTruck && (
            <div className="py-4">
              <p className="text-sm text-gray-700 mb-2"><span className="font-semibold">Truck:</span> {selectedTruck.vehicleNumber}</p>
              <p className="text-sm text-gray-700 mb-2"><span className="font-semibold">Driver:</span> {selectedTruck.driverName}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Transporter:</span> {selectedTruck.transporter}</p>
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsProcessModalOpen(false);
                setSelectedTruck(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              className={`${activeTab === "Upcoming" ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"} text-white`}
              onClick={activeTab === "Upcoming" ? handleProcessTruck : handleMoveToUpcoming}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Truck Replacement Component */}
      <TruckReplacement 
        isOpen={isReplaceModalOpen}
        onClose={() => setIsReplaceModalOpen(false)}
        selectedTruck={selectedTruck}
        transporters={transporters}
        suppliers={suppliers}
        onTruckReplaced={handleTruckReplaced}
      />
      
      {/* Transshipment Details Dialog */}
      <TransshipmentDetails 
        isOpen={isTransshipmentDetailsOpen}
        onClose={() => setIsTransshipmentDetailsOpen(false)}
        originalTruckInfo={selectedOriginalTruckInfo}
      />
      
      {/* Truck Processing Modal */}
      <TruckProcessingModal 
        isOpen={isProcessingModalOpen}
        onClose={() => setIsProcessingModalOpen(false)}
        truck={selectedTruck}
        onProcessingComplete={handleTruckProcessed}
      />
      
      {/* Processing Details Dialog */}
      {renderProcessingDetailsDialog()}
    </div>
  );
};

export default TruckEntry; 