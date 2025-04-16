import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  RefreshCw,
  ExternalLink,
  Clock,
  AlertTriangle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import { format, differenceInMinutes, differenceInHours } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Interface for exited trucks
interface ExitedTruck {
  id: string;
  truckNumber?: string;
  driverName?: string;
  driverMobile?: string;
  vehicleNumber?: string;
  depotName?: string;
  transporter?: string;
  materialType?: string;
  arrivalDateTime?: any;
  exitedAt?: any;
  exitedBy?: string;
  weightData?: any;
  [key: string]: any;
}

// Interface for TAT settings
interface TATSettings {
  fgTAT: number;
  rmTAT: number;
  pmTAT: number;
  defaultTAT: number;
  warningThreshold: number;
  criticalThreshold: number;
}

const Exit = () => {
  const { toast } = useToast();
  const [trucks, setTrucks] = useState<ExitedTruck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [transporterFilter, setTransporterFilter] = useState("all");
  const [materialTypeFilter, setMaterialTypeFilter] = useState("all");
  const [depotFilter, setDepotFilter] = useState("all");
  
  // Filter options
  const [transporters, setTransporters] = useState<string[]>([]);
  const [depots, setDepots] = useState<string[]>([]);
  
  // TAT Settings
  const [tatSettings, setTatSettings] = useState<TATSettings>({
    fgTAT: 180, // 3 hours in minutes as default
    rmTAT: 180,
    pmTAT: 180,
    defaultTAT: 180,
    warningThreshold: 20, // 20% default
    criticalThreshold: 50 // 50% default
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch settings and trucks on mount
  useEffect(() => {
    fetchSettings();
    fetchTATSettings();
    fetchExitedTrucks();
  }, []);

  // Fetch settings (transporters and depots)
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

  // Fetch TAT settings
  const fetchTATSettings = async () => {
    try {
      const tatSettingsRef = doc(db, "organizationSettings", "tatSettings");
      const tatSettingsSnapshot = await getDoc(tatSettingsRef);
      
      if (tatSettingsSnapshot.exists()) {
        const data = tatSettingsSnapshot.data();
        
        setTatSettings({
          fgTAT: data.fgTAT || 180,
          rmTAT: data.rmTAT || 180,
          pmTAT: data.pmTAT || 180,
          defaultTAT: data.defaultTAT || 180,
          warningThreshold: data.warningThreshold || 20,
          criticalThreshold: data.criticalThreshold || 50
        });
      }
    } catch (error) {
      console.error("Error fetching TAT settings:", error);
    }
  };

  // Fetch exited trucks
  const fetchExitedTrucks = async () => {
    setLoading(true);
    try {
      const trucksQuery = query(
        collection(db, "transporterCollaborations"),
        where("status", "==", "Exited"),
        where("nextMilestone", "==", "WeighBridge"),
        orderBy("exitedAt", "desc")
      );
      
      const snapshot = await getDocs(trucksQuery);
      const trucksData: ExitedTruck[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<ExitedTruck, "id">;
        trucksData.push({
          id: doc.id,
          ...data
        });
      });
      
      setTrucks(trucksData);
      
      if (trucksData.length === 0) {
        toast({
          title: "No exited trucks found",
          description: "There are no trucks that have been exited from the weighbridge.",
        });
      }
    } catch (error) {
      console.error("Error fetching exited trucks: ", error);
      toast({
        title: "Error loading trucks",
        description: "Failed to load exited trucks data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    
    try {
      // Handle Firestore timestamp objects
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        return format(dateValue.toDate(), "PPpp");
      }
      
      // Handle string dates
      return format(new Date(dateValue), "PPpp");
    } catch (error) {
      return String(dateValue) || 'Invalid date';
    }
  };

  // Calculate Turn Around Time (TAT) between arrival and exit
  const calculateTAT = (arrivalDateTime: any, exitedAt: any) => {
    if (!arrivalDateTime || !exitedAt) return 'N/A';
    
    try {
      // Convert to Date objects if they are Firestore timestamps
      const arrivalDate = arrivalDateTime.toDate ? arrivalDateTime.toDate() : new Date(arrivalDateTime);
      const exitDate = exitedAt.toDate ? exitedAt.toDate() : new Date(exitedAt);
      
      // Calculate difference
      const hoursDiff = differenceInHours(exitDate, arrivalDate);
      const minutesDiff = differenceInMinutes(exitDate, arrivalDate) % 60;
      
      return `${hoursDiff}h ${minutesDiff}m`;
    } catch (error) {
      return 'Error calculating';
    }
  };

  // Calculate TAT in minutes
  const calculateTATMinutes = (arrivalDateTime: any, exitedAt: any): number => {
    if (!arrivalDateTime || !exitedAt) return 0;
    
    try {
      // Convert to Date objects if they are Firestore timestamps
      const arrivalDate = arrivalDateTime.toDate ? arrivalDateTime.toDate() : new Date(arrivalDateTime);
      const exitDate = exitedAt.toDate ? exitedAt.toDate() : new Date(exitedAt);
      
      // Calculate difference in minutes
      return differenceInMinutes(exitDate, arrivalDate);
    } catch (error) {
      return 0;
    }
  };
  
  // Get ideal TAT for a truck based on material type
  const getIdealTAT = (materialType: string): number => {
    switch (materialType?.toUpperCase()) {
      case 'FG':
        return tatSettings.fgTAT;
      case 'RM':
        return tatSettings.rmTAT;
      case 'PM':
        return tatSettings.pmTAT;
      default:
        return tatSettings.defaultTAT;
    }
  };
  
  // Get TAT status for truck (normal, warning, critical)
  const getTATStatus = (truck: ExitedTruck): 'normal' | 'warning' | 'critical' => {
    const actualTAT = calculateTATMinutes(truck.arrivalDateTime, truck.exitedAt);
    const idealTAT = getIdealTAT(truck.materialType || '');
    
    if (actualTAT === 0 || idealTAT === 0) return 'normal';
    
    // Calculate percentage over ideal TAT
    const percentageOver = ((actualTAT - idealTAT) / idealTAT) * 100;
    
    if (percentageOver >= tatSettings.criticalThreshold) {
      return 'critical';
    } else if (percentageOver >= tatSettings.warningThreshold) {
      return 'warning';
    } else {
      return 'normal';
    }
  };
  
  // Get TAT cell background color
  const getTATCellColor = (status: 'normal' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'warning':
        return 'bg-yellow-50 text-yellow-700';
      case 'critical':
        return 'bg-red-50 text-red-700';
      default:
        return '';
    }
  };
  
  // Get TAT tooltip message
  const getTATTooltip = (truck: ExitedTruck): string => {
    const actualTAT = calculateTATMinutes(truck.arrivalDateTime, truck.exitedAt);
    const idealTAT = getIdealTAT(truck.materialType || '');
    const status = getTATStatus(truck);
    
    if (status === 'normal') {
      return `TAT within acceptable range. Ideal: ${Math.floor(idealTAT / 60)}h ${idealTAT % 60}m`;
    }
    
    const overMinutes = actualTAT - idealTAT;
    const percentageOver = ((actualTAT - idealTAT) / idealTAT) * 100;
    
    if (status === 'critical') {
      return `Critical: TAT exceeds ideal by ${Math.round(percentageOver)}% (${Math.floor(overMinutes / 60)}h ${overMinutes % 60}m over)`;
    } else {
      return `Warning: TAT exceeds ideal by ${Math.round(percentageOver)}% (${Math.floor(overMinutes / 60)}h ${overMinutes % 60}m over)`;
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTATSettings();
    await fetchExitedTrucks();
    setRefreshing(false);
  };

  // Filter trucks based on search and filters
  const filteredTrucks = trucks.filter(truck => {
    const matchesSearch = 
      (truck.truckNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (truck.driverName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (truck.vehicleNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (truck.driverMobile || "").includes(searchTerm);
    
    const matchesTransporter = transporterFilter === "all" || truck.transporter === transporterFilter;
    const matchesMaterial = materialTypeFilter === "all" || truck.materialType === materialTypeFilter;
    const matchesDepot = depotFilter === "all" || truck.depotName === depotFilter;
    
    return matchesSearch && matchesTransporter && matchesMaterial && matchesDepot;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredTrucks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTrucks = filteredTrucks.slice(startIndex, startIndex + itemsPerPage);
  
  // Calculate TAT statistics
  const calculateTATStatistics = () => {
    if (filteredTrucks.length === 0) return { average: 0, min: 0, max: 0, warning: 0, critical: 0 };
    
    let totalTAT = 0;
    let minTAT = Infinity;
    let maxTAT = 0;
    let warningCount = 0;
    let criticalCount = 0;
    
    filteredTrucks.forEach(truck => {
      const tatMinutes = calculateTATMinutes(truck.arrivalDateTime, truck.exitedAt);
      if (tatMinutes > 0) {
        totalTAT += tatMinutes;
        minTAT = Math.min(minTAT, tatMinutes);
        maxTAT = Math.max(maxTAT, tatMinutes);
        
        const status = getTATStatus(truck);
        if (status === 'warning') warningCount++;
        if (status === 'critical') criticalCount++;
      }
    });
    
    const validTrucks = filteredTrucks.filter(t => calculateTATMinutes(t.arrivalDateTime, t.exitedAt) > 0).length;
    
    return {
      average: validTrucks > 0 ? Math.round(totalTAT / validTrucks) : 0,
      min: minTAT === Infinity ? 0 : minTAT,
      max: maxTAT,
      warning: warningCount,
      critical: criticalCount
    };
  };
  
  const stats = calculateTATStatistics();
  
  // Format minutes to hours and minutes
  const formatMinutesToHM = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Exit Page</h1>
          <p className="text-gray-600">View all trucks that have been exited from the weighbridge</p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="mt-2 md:mt-0"
        >
          <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {/* TAT Statistics */}
      {filteredTrucks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Average TAT</h3>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{formatMinutesToHM(stats.average)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Min TAT</h3>
              <Clock className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{formatMinutesToHM(stats.min)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Max TAT</h3>
              <Clock className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{formatMinutesToHM(stats.max)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Warning TAT</h3>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="flex items-center mt-1">
              <p className="text-2xl font-bold">{stats.warning}</p>
              <p className="text-sm text-gray-500 ml-2">trucks</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Critical TAT</h3>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div className="flex items-center mt-1">
              <p className="text-2xl font-bold">{stats.critical}</p>
              <p className="text-sm text-gray-500 ml-2">trucks</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search trucks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
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
            <SelectValue placeholder="Filter by material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Materials</SelectItem>
            <SelectItem value="FG">FG</SelectItem>
            <SelectItem value="RM">RM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
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
      
      {/* TAT Color Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-sm font-medium">TAT Status:</div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
          <span className="text-sm">Normal</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
          <span className="text-sm">Warning (≥{tatSettings.warningThreshold}% over ideal)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
          <span className="text-sm">Critical (≥{tatSettings.criticalThreshold}% over ideal)</span>
        </div>
      </div>
      
      {/* Table */}
      <div className="bg-white rounded-lg shadow-md p-6 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transporter</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TAT</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedTrucks.length > 0 ? (
                    paginatedTrucks.map((truck) => {
                      const tatStatus = getTATStatus(truck);
                      const tatCellColor = getTATCellColor(tatStatus);
                      const tatTooltip = getTATTooltip(truck);
                      
                      return (
                        <tr key={truck.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.truckNumber || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.driverName || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.vehicleNumber || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.transporter || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.materialType || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(truck.arrivalDateTime)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(truck.exitedAt)}</td>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium rounded-md ${tatCellColor}`}>
                                  <div className="flex items-center">
                                    {tatStatus !== 'normal' && (
                                      <div className={`w-2 h-2 rounded-full mr-2 ${tatStatus === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                    )}
                                    {calculateTAT(truck.arrivalDateTime, truck.exitedAt)}
                                  </div>
                                </td>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{tatTooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                              <ExternalLink size={12} />
                              Exited
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <ExternalLink size={48} className="text-gray-300 mb-4" />
                          <p className="text-gray-500 font-medium">No weighbridge exited trucks found</p>
                          <p className="text-gray-400 text-sm mt-1">When trucks are exited from the weighbridge, they will appear here</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {filteredTrucks.length > itemsPerPage && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink 
                          isActive={currentPage === i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    {totalPages > 5 && (
                      <>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setCurrentPage(totalPages)}
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
    </div>
  );
};

export default Exit; 