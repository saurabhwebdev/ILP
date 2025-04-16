import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  limit,
  where
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { CalendarIcon, Search, AlertTriangle, Filter, FilterX, X, MoreHorizontal, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatabaseZap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
}

const TransporterCollaboration = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Form fields
  const [truckNumber, setTruckNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [driverLicense, setDriverLicense] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [depotName, setDepotName] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [rtoCapacity, setRtoCapacity] = useState("");
  const [loadingCapacity, setLoadingCapacity] = useState("");
  const [transporter, setTransporter] = useState("");
  const [arrivalDateTime, setArrivalDateTime] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [supplierName, setSupplierName] = useState("");
  
  // History table state
  const [truckHistory, setTruckHistory] = useState<TruckCollaboration[]>([]);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Dropdown options
  const [depots, setDepots] = useState<string[]>([]);
  const [transporters, setTransporters] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const materialTypes = ["FG", "PM", "RM"];
  const statusTypes = ["All", "Pending", "At Gate", "Inside", "Completed"];
  
  // New state variables
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Column filters
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  
  // State for the truck details modal
  const [selectedTruck, setSelectedTruck] = useState<TruckCollaboration | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  useEffect(() => {
    const fetchTransporterSettings = async () => {
      try {
        // Get organization settings doc
        const settingsRef = doc(db, "organizationSettings", "transporterSettings");
        const settingsSnapshot = await getDoc(settingsRef);
        
        if (settingsSnapshot.exists()) {
          const data = settingsSnapshot.data();
          setDepots(data.depots || []);
          setTransporters(data.transporters || []);
          setSuppliers(data.suppliers || []);
        } else {
          // Use default values if no settings exist
          setDepots(["Depot A", "Depot B", "Depot C", "Depot D"]);
          setTransporters(["Transporter 1", "Transporter 2", "Transporter 3"]);
          setSuppliers(["Supplier A", "Supplier B", "Supplier C", "Supplier D"]);
        }
      } catch (error) {
        console.error("Error fetching transporter settings: ", error);
        toast({
          title: "Error loading settings",
          description: "Failed to load transporter options.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransporterSettings();
    fetchTruckHistory();
  }, [toast]);
  
  // Fetch truck history
  const fetchTruckHistory = async () => {
    setLoadingHistory(true);
    try {
      let historyQuery;
      
      // Base query - sorted by arrival date descending (most recent first)
      historyQuery = query(
        collection(db, "transporterCollaborations"),
        orderBy("arrivalDateTime", "desc"),
        limit(100) // Limit to 100 records for performance
      );
      
      const snapshot = await getDocs(historyQuery);
      const historyData: TruckCollaboration[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<TruckCollaboration, "id">;
        historyData.push({
          id: doc.id,
          ...data
        });
      });
      
      setTruckHistory(historyData);
    } catch (error) {
      console.error("Error fetching truck history: ", error);
      toast({
        title: "Error loading history",
        description: "Failed to load truck history data.",
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // Fetch truck history on component mount
  useEffect(() => {
    fetchTruckHistory();
  }, []);
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, historyFilter]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit a collaboration.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Save to Firestore
      const collaborationData = {
        truckNumber,
        driverName,
        driverMobile,
        driverLicense,
        vehicleNumber,
        depotName,
        lrNumber,
        rtoCapacity,
        loadingCapacity,
        transporter,
        arrivalDateTime,
        materialType,
        supplierName,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        status: "Pending"
      };
      
      await addDoc(collection(db, "transporterCollaborations"), collaborationData);
      
      toast({
        title: "Collaboration registered",
        description: "Transporter collaboration details have been successfully recorded.",
      });
      
      // Reset form
      setTruckNumber("");
      setDriverName("");
      setDriverMobile("");
      setDriverLicense("");
      setVehicleNumber("");
      setDepotName("");
      setLrNumber("");
      setRtoCapacity("");
      setLoadingCapacity("");
      setTransporter("");
      setArrivalDateTime("");
      setMaterialType("");
      setSupplierName("");
      
      // Refresh history to include the new entry
      fetchTruckHistory();
    } catch (error) {
      console.error("Error saving collaboration: ", error);
      toast({
        title: "Error saving collaboration",
        description: "Failed to save transporter collaboration details.",
        variant: "destructive",
      });
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPpp");
    } catch (error) {
      return dateString;
    }
  };
  
  // Apply filters to truck history
  const filteredHistory = truckHistory.filter((truck) => {
    const matchesSearch = 
      searchTerm === "" || 
      truck.truckNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.transporter?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = historyFilter === "all" || truck.status === historyFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Paginate results
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  
  // Function to apply a column filter
  const applyColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
    setCurrentPage(1); // Reset to first page when applying filter
  };

  // Function to clear a specific column filter
  const clearColumnFilter = (column: string) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[column];
      return newFilters;
    });
    setCurrentPage(1); // Reset to first page when clearing filter
  };

  // Function to clear all column filters
  const clearAllColumnFilters = () => {
    setColumnFilters({});
    setCurrentPage(1); // Reset to first page when clearing all filters
  };

  // Utility function to get unique values for a column for filters
  const getUniqueColumnValues = (columnName: string): string[] => {
    const uniqueValues = Array.from(new Set(
      truckHistory
        .map(truck => String(truck[columnName as keyof TruckCollaboration]))
        .filter(Boolean) // Filter out null/undefined values
    ));
    return uniqueValues.sort();
  };

  // Function to render the column filter component
  const renderColumnFilter = (columnName: string, displayName: string) => {
    const uniqueValues = getUniqueColumnValues(columnName);
    
    if (uniqueValues.length <= 1) return null; // Don't show filter if only one or no values
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 -mr-2">
            <Filter className={`h-3.5 w-3.5 ${columnFilters[columnName] ? 'text-primary' : 'text-muted-foreground'}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Filter {displayName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={columnFilters[columnName] || ''} onValueChange={(value) => {
            if (value === '') {
              clearColumnFilter(columnName);
            } else {
              applyColumnFilter(columnName, value);
            }
          }}>
            <DropdownMenuRadioItem value="">All</DropdownMenuRadioItem>
            {uniqueValues.map((value) => (
              <DropdownMenuRadioItem key={value} value={value}>
                {value}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {columnFilters[columnName] && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => clearColumnFilter(columnName)}>
                <X className="mr-2 h-4 w-4" />Clear filter
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };
  
  const renderHistoryTable = () => {
    // Filter the truck history based on search term and the history filter first
    let filteredHistory = truckHistory.filter((truck) => {
      const matchesSearch =
        searchTerm === "" ||
        truck.truckNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        truck.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        truck.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        truck.transporter?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesHistoryFilter =
        historyFilter === "all" ||
        (historyFilter === "completed" && truck.status === "Completed") ||
        (historyFilter === "pending" && truck.status === "Pending") ||
        (historyFilter === "at-gate" && truck.status === "At Gate") ||
        (historyFilter === "inside" && truck.status === "Inside");

      return matchesSearch && matchesHistoryFilter;
    });

    // Then apply column filters
    if (Object.keys(columnFilters).length > 0) {
      filteredHistory = filteredHistory.filter(truck => {
        return Object.entries(columnFilters).every(([column, value]) => {
          return String(truck[column as keyof TruckCollaboration]) === value;
        });
      });
    }

    // Paginate the filtered history
    const paginatedHistory = filteredHistory.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    
    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
    
    return (
      <div className="rounded-md border mt-4">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <DatabaseZap className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold">No trucks found</h3>
            <p className="text-sm text-muted-foreground">
              {Object.keys(columnFilters).length > 0 || searchTerm !== "" || historyFilter !== "all" ? (
                <>
                  No trucks match your filters. 
                  <Button variant="link" onClick={() => {
                    setSearchTerm("");
                    setHistoryFilter("all");
                    clearAllColumnFilters();
                  }}>
                    Clear all filters
                  </Button>
                </>
              ) : (
                "No truck history data is available"
              )}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  Transporter
                  {renderColumnFilter("transporter", "Transporter")}
                </TableHead>
                <TableHead>
                  Vehicle Number
                  {renderColumnFilter("vehicleNumber", "Vehicle")}
                </TableHead>
                <TableHead>
                  Driver
                  {renderColumnFilter("driverName", "Driver")}
                </TableHead>
                <TableHead>
                  Depot
                  {renderColumnFilter("depotName", "Depot")}
                </TableHead>
                <TableHead>
                  Material Type
                  {renderColumnFilter("materialType", "Material")}
                </TableHead>
                <TableHead>
                  Status
                  {renderColumnFilter("status", "Status")}
                </TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedHistory.length > 0 ? (
                paginatedHistory.map((truck) => (
                  <TableRow key={truck.id}>
                    <TableCell className="font-medium">{truck.transporter}</TableCell>
                    <TableCell>{truck.vehicleNumber}</TableCell>
                    <TableCell>{truck.driverName}</TableCell>
                    <TableCell>{truck.depotName}</TableCell>
                    <TableCell>{truck.materialType}</TableCell>
                    <TableCell>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${truck.status === "At Gate" ? "bg-blue-100 text-blue-800" : 
                          truck.status === "Inside" ? "bg-green-100 text-green-800" : 
                          truck.status === "Completed" ? "bg-gray-100 text-gray-800" :
                          truck.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"}`}>
                        {truck.status}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(truck.arrivalDateTime)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => viewTruckDetails(truck)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No truck history found matching your criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    );
  };
  
  // Function to view truck details
  const viewTruckDetails = (truck: TruckCollaboration) => {
    setSelectedTruck(truck);
    setIsDetailsModalOpen(true);
  };

  // Function to close the details modal
  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedTruck(null);
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ilp-navy"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-ilp-navy mb-6">Transporter Collaboration</h1>
      
      <Tabs defaultValue="register" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="register">Register New Truck</TabsTrigger>
          <TabsTrigger value="history">Truck History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="register">
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="truck-number">Truck Number</Label>
                  <Input 
                    id="truck-number" 
                    value={truckNumber}
                    onChange={(e) => setTruckNumber(e.target.value)}
                    placeholder="Enter truck number"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="driver-name">Driver Name</Label>
                  <Input 
                    id="driver-name" 
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Enter driver name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="driver-mobile">Driver Mobile Number</Label>
                  <Input 
                    id="driver-mobile" 
                    value={driverMobile}
                    onChange={(e) => setDriverMobile(e.target.value)}
                    placeholder="Enter driver mobile number"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="driver-license">Driver License Number</Label>
                  <Input 
                    id="driver-license" 
                    value={driverLicense}
                    onChange={(e) => setDriverLicense(e.target.value)}
                    placeholder="Enter driver license number"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vehicle-number">Vehicle Number</Label>
                  <Input 
                    id="vehicle-number" 
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="Enter vehicle number"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="depot-name">Depot Name</Label>
                  <Select
                    value={depotName}
                    onValueChange={setDepotName}
                  >
                    <SelectTrigger id="depot-name" className="w-full">
                      <SelectValue placeholder="Select depot" />
                    </SelectTrigger>
                    <SelectContent>
                      {depots.map((depot) => (
                        <SelectItem key={depot} value={depot}>
                          {depot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lr-number">LR Number</Label>
                  <Input 
                    id="lr-number" 
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                    placeholder="Enter LR number"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rto-capacity">RTO Passing Capacity (tonnes)</Label>
                  <Input 
                    id="rto-capacity" 
                    type="number"
                    value={rtoCapacity}
                    onChange={(e) => setRtoCapacity(e.target.value)}
                    placeholder="Enter RTO passing capacity"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="loading-capacity">Loading Capacity (tonnes)</Label>
                  <Input 
                    id="loading-capacity" 
                    type="number"
                    value={loadingCapacity}
                    onChange={(e) => setLoadingCapacity(e.target.value)}
                    placeholder="Enter loading capacity"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="transporter">Select Transporter</Label>
                  <Select
                    value={transporter}
                    onValueChange={setTransporter}
                  >
                    <SelectTrigger id="transporter" className="w-full">
                      <SelectValue placeholder="Select transporter" />
                    </SelectTrigger>
                    <SelectContent>
                      {transporters.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="arrival-time">Date and Time of Arrival</Label>
                  <Input 
                    id="arrival-time" 
                    type="datetime-local"
                    value={arrivalDateTime}
                    onChange={(e) => setArrivalDateTime(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="material-type">Material Type</Label>
                  <Select
                    value={materialType}
                    onValueChange={setMaterialType}
                  >
                    <SelectTrigger id="material-type" className="w-full">
                      <SelectValue placeholder="Select material type" />
                    </SelectTrigger>
                    <SelectContent>
                      {materialTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supplier-name">Supplier Name</Label>
                  <Select
                    value={supplierName}
                    onValueChange={setSupplierName}
                  >
                    <SelectTrigger id="supplier-name" className="w-full">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier} value={supplier}>
                          {supplier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-8">
                <Button 
                  type="submit" 
                  className="bg-ilp-navy hover:bg-ilp-navy/90 text-white"
                >
                  Submit Collaboration
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-ilp-navy mb-4">Truck Schedule History</h2>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input 
                  type="search" 
                  placeholder="Search trucks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select
                value={historyFilter}
                onValueChange={setHistoryFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Upcoming</SelectItem>
                  <SelectItem value="At Gate">At Gate</SelectItem>
                  <SelectItem value="Inside">Inside</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {renderHistoryTable()}
          </div>
        </TabsContent>
      </Tabs>

      {/* Truck Details Modal */}
      {isDetailsModalOpen && selectedTruck && (
        <Dialog open={isDetailsModalOpen} onOpenChange={closeDetailsModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Truck Details</DialogTitle>
              <DialogDescription>
                Complete information about this truck.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Transporter:</Label>
                <div className="col-span-2">{selectedTruck.transporter}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Vehicle Number:</Label>
                <div className="col-span-2">{selectedTruck.vehicleNumber}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Driver:</Label>
                <div className="col-span-2">{selectedTruck.driverName}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Material Type:</Label>
                <div className="col-span-2">{selectedTruck.materialType}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Status:</Label>
                <div className="col-span-2">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${selectedTruck.status === "At Gate" ? "bg-blue-100 text-blue-800" : 
                    selectedTruck.status === "Inside" ? "bg-green-100 text-green-800" : 
                    selectedTruck.status === "Completed" ? "bg-gray-100 text-gray-800" : 
                    selectedTruck.status === "Pending" ? "bg-yellow-100 text-yellow-800" : 
                    "bg-gray-100 text-gray-800"}`}
                  >
                    {selectedTruck.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Arrival Time:</Label>
                <div className="col-span-2">{formatDate(selectedTruck.arrivalDateTime)}</div>
              </div>
              {selectedTruck.depotName && (
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-right font-medium">Depot:</Label>
                  <div className="col-span-2">{selectedTruck.depotName}</div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDetailsModal}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TransporterCollaboration; 