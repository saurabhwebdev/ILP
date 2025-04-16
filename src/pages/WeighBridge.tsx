import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { Search, RefreshCw, Scale, ClipboardList, CornerRightDown, CornerRightUp } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import WeighBridgeModal from "@/components/WeighBridgeModal";
import OutgoingNonReturnableModal from "@/components/OutgoingNonReturnableModal";
import OutgoingReturnableModal from "@/components/OutgoingReturnableModal";

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
  nextMilestone?: "WeighBridge" | "InternalParking";
  weighbridgeProcessingComplete?: boolean;
  weightData?: any;
}

const WeighBridge = () => {
  const { toast } = useToast();
  const [trucks, setTrucks] = useState<TruckCollaboration[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [transporterFilter, setTransporterFilter] = useState("all");
  const [materialTypeFilter, setMaterialTypeFilter] = useState("all");
  const [depotFilter, setDepotFilter] = useState("all");
  
  // Settings options
  const [transporters, setTransporters] = useState<string[]>([]);
  const [depots, setDepots] = useState<string[]>([]);
  const materialTypes = ["FG", "PM", "RM"];
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Weight recording modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<TruckCollaboration | null>(null);

  // Additional state for new modal types
  const [isOutgoingNonReturnableModalOpen, setIsOutgoingNonReturnableModalOpen] = useState(false);
  const [isOutgoingReturnableModalOpen, setIsOutgoingReturnableModalOpen] = useState(false);

  // Fetch settings (transporters and depots)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsRef = collection(db, "organizationSettings");
        const settingsSnapshot = await getDocs(query(settingsRef));
        
        settingsSnapshot.forEach((doc) => {
          if (doc.id === "transporterSettings") {
            const data = doc.data();
            setDepots(data.depots || []);
            setTransporters(data.transporters || []);
          }
        });
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    
    fetchSettings();
  }, []);

  // Fetch trucks inside the premises
  useEffect(() => {
    fetchTrucks();
  }, []);

  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const trucksQuery = query(
        collection(db, "transporterCollaborations"),
        where("status", "==", "Inside"),
        where("nextMilestone", "==", "WeighBridge"),
        orderBy("arrivalDateTime")
      );
      
      const snapshot = await getDocs(trucksQuery);
      const trucksData: TruckCollaboration[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<TruckCollaboration, "id">;
        trucksData.push({
          id: doc.id,
          ...data
        });
      });
      
      setTrucks(trucksData);
    } catch (error) {
      console.error("Error fetching inside trucks: ", error);
      toast({
        title: "Error loading trucks",
        description: "Failed to load trucks data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string | any) => {
    try {
      if (!dateString) return "-";
      
      // Handle Firestore Timestamp
      if (dateString.toDate) {
        return format(dateString.toDate(), "MMM d, yyyy h:mm a");
      }
      
      // Handle ISO string
      return format(new Date(dateString), "MMM d, yyyy h:mm a");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "-";
    }
  };

  // Filter trucks based on search term and filters
  const filteredTrucks = trucks.filter(truck => {
    const matchesSearch = 
      truck.truckNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.driverMobile?.includes(searchTerm);
    
    const matchesTransporter = transporterFilter === "all" || truck.transporter === transporterFilter;
    const matchesMaterial = materialTypeFilter === "all" || truck.materialType === materialTypeFilter;
    const matchesDepot = depotFilter === "all" || truck.depotName === depotFilter;
    
    return matchesSearch && matchesTransporter && matchesMaterial && matchesDepot;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredTrucks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTrucks = filteredTrucks.slice(startIndex, startIndex + itemsPerPage);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTrucks();
    setRefreshing(false);
  };

  // Open weight recording modal for a truck
  const openWeighBridgeModal = (truck: TruckCollaboration) => {
    setSelectedTruck(truck);
    setIsModalOpen(true);
  };

  // Close weight recording modal
  const closeWeighBridgeModal = () => {
    setIsModalOpen(false);
    setSelectedTruck(null);
  };

  // Handle processing complete
  const handleProcessingComplete = () => {
    fetchTrucks();
  };

  // Open Outgoing Non-Returnable Register modal
  const openOutgoingNonReturnableModal = (truck: TruckCollaboration) => {
    setSelectedTruck(truck);
    setIsOutgoingNonReturnableModalOpen(true);
  };

  // Close Outgoing Non-Returnable Register modal
  const closeOutgoingNonReturnableModal = () => {
    setIsOutgoingNonReturnableModalOpen(false);
    setSelectedTruck(null);
  };

  // Open Outgoing Returnable Register modal
  const openOutgoingReturnableModal = (truck: TruckCollaboration) => {
    setSelectedTruck(truck);
    setIsOutgoingReturnableModalOpen(true);
  };

  // Close Outgoing Returnable Register modal
  const closeOutgoingReturnableModal = () => {
    setIsOutgoingReturnableModalOpen(false);
    setSelectedTruck(null);
  };

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Weigh Bridge - Inside Trucks</h1>
          <p className="text-sm text-gray-600 mt-1">
            This page shows only trucks that have been directed to the Weigh Bridge as their next milestone.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
          value={transporterFilter}
          onValueChange={setTransporterFilter}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by transporter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transporters</SelectItem>
            {transporters.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={materialTypeFilter}
          onValueChange={setMaterialTypeFilter}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by material type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Material Types</SelectItem>
            {materialTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={depotFilter}
          onValueChange={setDepotFilter}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by depot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Depots</SelectItem>
            {depots.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ilp-navy"></div>
          </div>
        ) : (
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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weightment Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedTrucks.length > 0 ? (
                    paginatedTrucks.map((truck) => (
                      <tr key={truck.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.truckNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.driverName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.vehicleNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.driverMobile}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.depotName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.transporter}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(truck.arrivalDateTime)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.materialType}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {truck.weightData ? (
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
                          ) : (
                            <span className="text-gray-400">No weights recorded</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {truck.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-2">
                            {truck.weighbridgeProcessingComplete ? (
                              <Badge 
                                variant="outline" 
                                className="bg-green-50 text-green-700 border-green-200 mb-2"
                              >
                                Processed
                              </Badge>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => openWeighBridgeModal(truck)}
                                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 mb-2"
                              >
                                <Scale size={14} />
                                {truck.weightData ? (
                                  truck.weightData.approvalStatus === "rejected" ? 
                                    'Update Invoice Weight' : 
                                    'Continue Weighment'
                                ) : 'Start Weighment'}
                              </Button>
                            )}

                            <Button 
                              size="sm" 
                              onClick={() => openOutgoingNonReturnableModal(truck)}
                              className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 text-xs py-1"
                            >
                              <CornerRightUp size={14} />
                              Outgoing Non-Returnable
                            </Button>
                            
                            <Button 
                              size="sm" 
                              onClick={() => openOutgoingReturnableModal(truck)}
                              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 text-xs py-1"
                            >
                              <CornerRightDown size={14} />
                              Outgoing Returnable
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-6 py-4 text-center text-sm text-gray-500">
                        No trucks found directed to Weigh Bridge. Only trucks that have been marked for Weigh Bridge will appear here.
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
        )}
      </div>

      {/* WeighBridge Modal */}
      {selectedTruck && (
        <>
          <WeighBridgeModal
            isOpen={isModalOpen}
            onClose={closeWeighBridgeModal}
            truck={selectedTruck}
            onProcessingComplete={handleProcessingComplete}
          />
          
          <OutgoingNonReturnableModal
            isOpen={isOutgoingNonReturnableModalOpen}
            onClose={closeOutgoingNonReturnableModal}
            truck={selectedTruck}
            onProcessingComplete={handleProcessingComplete}
          />
          
          <OutgoingReturnableModal
            isOpen={isOutgoingReturnableModalOpen}
            onClose={closeOutgoingReturnableModal}
            truck={selectedTruck}
            onProcessingComplete={handleProcessingComplete}
          />
        </>
      )}
    </div>
  );
};

export default WeighBridge; 