import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Sparkles, BarChart3, LineChart, PieChart, Clock, Filter, Loader2, ShieldAlert, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { doc, collection, query, where, getDocs, getDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, differenceInMinutes, subDays } from "date-fns";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
  PieChart as ReChartPie, Pie, Cell, LineChart as ReLineChart, Line,
  CartesianGrid
} from "recharts";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// TAT settings interface
interface TATSettings {
  fgTAT: number;
  rmTAT: number;
  pmTAT: number;
  defaultTAT: number;
  warningThreshold: number;
  criticalThreshold: number;
}

// Truck interface
interface ExitedTruck {
  id: string;
  truckNumber: string;
  vehicleNumber: string;
  driverName: string;
  transporter: string;
  materialType: string;
  depotName: string;
  arrivalDateTime: any;
  exitedAt: any;
  status: string;
}

// Approval request interface
interface ApprovalRequest {
  id: string;
  truckId: string;
  vehicleNumber?: string;
  truckNumber?: string;
  driverName?: string;
  requestedBy: string;
  requestedAt: any;
  reason: string;
  status: "pending" | "approved" | "rejected";
  type?: string;
  requestType?: "documentsIncomplete" | "weightDiscrepancy" | "safetyChecks";
  safetyChecks?: Array<{
    name: string;
    description: string;
    response: "Yes" | "No";
    status: "PASS" | "FAIL";
  }>;
}

// Non-compliance category data
interface ComplianceStats {
  name: string;
  count: number;
  approved: number;
  rejected: number;
  pending: number;
}

// Daily compliance data
interface DailyComplianceData {
  date: string;
  total: number;
  documents: number;
  safety: number;
  weight: number;
}

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [tatSettings, setTatSettings] = useState<TATSettings>({
    fgTAT: 180,
    rmTAT: 180,
    pmTAT: 180,
    defaultTAT: 180,
    warningThreshold: 20,
    criticalThreshold: 50
  });
  const [trucks, setTrucks] = useState<ExitedTruck[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompliance, setLoadingCompliance] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");
  const [selectedComplianceType, setSelectedComplianceType] = useState<string>("all");
  const [drillDownView, setDrillDownView] = useState(false);
  const [complianceDrillDown, setComplianceDrillDown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("tat");
  
  useEffect(() => {
    fetchTATSettings();
    fetchExitedTrucks();
    fetchApprovalRequests();
  }, []);

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

  // Fetch approval requests
  const fetchApprovalRequests = async () => {
    setLoadingCompliance(true);
    try {
      const approvalsRef = collection(db, "approvalRequests");
      const approvalsQuery = query(approvalsRef);
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
      console.error("Error fetching approval requests:", error);
    } finally {
      setLoadingCompliance(false);
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
    } catch (error) {
      console.error("Error fetching exited trucks: ", error);
    } finally {
      setLoading(false);
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
  
  // Format minutes to hours and minutes
  const formatMinutesToHM = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };
  
  // Calculate TAT statistics by material type
  const calculateTATByMaterial = () => {
    const materialTypes = ['FG', 'RM', 'PM', 'Other'];
    const stats = materialTypes.map(material => {
      // Filter trucks by material type
      const materialTrucks = trucks.filter(truck => {
        if (material === 'Other') {
          return !['FG', 'RM', 'PM'].includes(truck.materialType?.toUpperCase() || '');
        }
        return truck.materialType?.toUpperCase() === material;
      });
      
      if (materialTrucks.length === 0) {
        return {
          name: material,
          ideal: getIdealTAT(material),
          actual: 0,
          count: 0,
          normal: 0,
          warning: 0,
          critical: 0
        };
      }
      
      let totalTAT = 0;
      let normalCount = 0;
      let warningCount = 0;
      let criticalCount = 0;
      
      materialTrucks.forEach(truck => {
        const tatMinutes = calculateTATMinutes(truck.arrivalDateTime, truck.exitedAt);
        if (tatMinutes > 0) {
          totalTAT += tatMinutes;
          
          const status = getTATStatus(truck);
          if (status === 'normal') normalCount++;
          if (status === 'warning') warningCount++;
          if (status === 'critical') criticalCount++;
        }
      });
      
      const validTrucks = materialTrucks.filter(t => calculateTATMinutes(t.arrivalDateTime, t.exitedAt) > 0).length;
      
      return {
        name: material,
        ideal: getIdealTAT(material),
        actual: validTrucks > 0 ? Math.round(totalTAT / validTrucks) : 0,
        count: validTrucks,
        normal: normalCount,
        warning: warningCount,
        critical: criticalCount
      };
    });
    
    return stats.filter(stat => stat.count > 0);
  };

  // Get filtered trucks based on selected material type
  const getFilteredTrucks = () => {
    if (selectedMaterial === 'all') {
      return trucks;
    } else if (selectedMaterial === 'Other') {
      return trucks.filter(truck => !['FG', 'RM', 'PM'].includes(truck.materialType?.toUpperCase() || ''));
    } else {
      return trucks.filter(truck => truck.materialType?.toUpperCase() === selectedMaterial);
    }
  };

  // Calculate TAT distribution for filtered trucks
  const calculateTATDistribution = () => {
    const filteredTrucks = getFilteredTrucks();
    let normal = 0, warning = 0, critical = 0;
    
    filteredTrucks.forEach(truck => {
      const status = getTATStatus(truck);
      if (status === 'normal') normal++;
      if (status === 'warning') warning++;
      if (status === 'critical') critical++;
    });
    
    return [
      { name: 'Normal', value: normal, color: '#22c55e' },
      { name: 'Warning', value: warning, color: '#eab308' },
      { name: 'Critical', value: critical, color: '#ef4444' }
    ].filter(item => item.value > 0);
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

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTATSettings();
    await fetchExitedTrucks();
    await fetchApprovalRequests();
    setRefreshing(false);
  };

  // Handle drilling down into material type
  const handleDrillDown = (material: string) => {
    setSelectedMaterial(material);
    setDrillDownView(true);
  };

  // Get status badge
  const getStatusBadge = (status: 'normal' | 'warning' | 'critical') => {
    switch (status) {
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Warning</Badge>;
      case 'critical':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Critical</Badge>;
      default:
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Normal</Badge>;
    }
  };
  
  const tatChartData = calculateTATByMaterial();
  const tatDistribution = calculateTATDistribution();
  const filteredTrucks = getFilteredTrucks();
  
  // Calculate compliance statistics by type
  const calculateComplianceByType = () => {
    const stats: ComplianceStats[] = [
      { name: 'Documents', count: 0, approved: 0, rejected: 0, pending: 0 },
      { name: 'Safety', count: 0, approved: 0, rejected: 0, pending: 0 },
      { name: 'Weight', count: 0, approved: 0, rejected: 0, pending: 0 }
    ];
    
    approvalRequests.forEach(request => {
      // Determine the type of non-compliance
      let typeIndex = 0; // Default to Documents
      
      if (request.type === 'safetyChecks' || request.requestType === 'safetyChecks') {
        typeIndex = 1; // Safety
      } else if (request.requestType === 'weightDiscrepancy') {
        typeIndex = 2; // Weight
      }
      
      // Increment total count for this type
      stats[typeIndex].count++;
      
      // Increment by status
      if (request.status === 'approved') {
        stats[typeIndex].approved++;
      } else if (request.status === 'rejected') {
        stats[typeIndex].rejected++;
      } else if (request.status === 'pending') {
        stats[typeIndex].pending++;
      }
    });
    
    // Filter out types with zero counts
    return stats.filter(stat => stat.count > 0);
  };
  
  // Get filtered approval requests based on selected type
  const getFilteredApprovalRequests = () => {
    if (selectedComplianceType === 'all') {
      return approvalRequests;
    } else if (selectedComplianceType === 'Documents') {
      return approvalRequests.filter(request => 
        request.type !== 'safetyChecks' && 
        request.requestType !== 'safetyChecks' && 
        request.requestType !== 'weightDiscrepancy'
      );
    } else if (selectedComplianceType === 'Safety') {
      return approvalRequests.filter(request => 
        request.type === 'safetyChecks' || 
        request.requestType === 'safetyChecks'
      );
    } else if (selectedComplianceType === 'Weight') {
      return approvalRequests.filter(request => 
        request.requestType === 'weightDiscrepancy'
      );
    }
    return approvalRequests;
  };
  
  // Calculate compliance status distribution
  const calculateComplianceStatusDistribution = () => {
    const filteredRequests = getFilteredApprovalRequests();
    let approved = 0, rejected = 0, pending = 0;
    
    filteredRequests.forEach(request => {
      if (request.status === 'approved') approved++;
      if (request.status === 'rejected') rejected++;
      if (request.status === 'pending') pending++;
    });
    
    return [
      { name: 'Approved', value: approved, color: '#22c55e' },
      { name: 'Rejected', value: rejected, color: '#ef4444' },
      { name: 'Pending', value: pending, color: '#eab308' }
    ].filter(item => item.value > 0);
  };

  // Calculate daily compliance issues over the last 30 days
  const calculateDailyComplianceData = () => {
    const dailyData: {[key: string]: DailyComplianceData} = {};
    
    // Initialize daily data for last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      dailyData[dateStr] = {
        date: format(date, 'MMM dd'),
        total: 0,
        documents: 0,
        safety: 0,
        weight: 0
      };
    }
    
    // Populate data from approval requests
    approvalRequests.forEach(request => {
      if (request.requestedAt) {
        try {
          const requestDate = request.requestedAt.toDate ? request.requestedAt.toDate() : new Date(request.requestedAt);
          const dateStr = format(requestDate, 'yyyy-MM-dd');
          
          // Only count if within the last 30 days
          if (dailyData[dateStr]) {
            dailyData[dateStr].total++;
            
            // Categorize by type
            if (request.type === 'safetyChecks' || request.requestType === 'safetyChecks') {
              dailyData[dateStr].safety++;
            } else if (request.requestType === 'weightDiscrepancy') {
              dailyData[dateStr].weight++;
            } else {
              dailyData[dateStr].documents++;
            }
          }
        } catch (error) {
          console.error("Error processing date:", error);
        }
      }
    });
    
    // Convert to array for recharts
    return Object.values(dailyData);
  };
  
  // Handle drilling down into compliance type
  const handleComplianceDrillDown = (type: string) => {
    setSelectedComplianceType(type);
    setComplianceDrillDown(true);
  };

  // Get status badge for compliance
  const getComplianceStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <h1 className="text-3xl font-bold text-ilp-navy mb-4">Dashboard</h1>
      <p className="text-xl text-gray-600 mb-8">
        Welcome back, {currentUser?.email?.split('@')[0] || 'User'}
      </p>

      <div className="w-full max-w-7xl">
        <Tabs defaultValue="tat" className="space-y-4" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="tat" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Turnaround Time (TAT)</span>
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex items-center gap-1">
                <ShieldAlert className="h-4 w-4" />
                <span>Compliance Issues</span>
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              {activeTab === "tat" && drillDownView && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDrillDownView(false);
                    setSelectedMaterial('all');
                  }}
                >
                  Back to Overview
                </Button>
              )}
              {activeTab === "compliance" && complianceDrillDown && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setComplianceDrillDown(false);
                    setSelectedComplianceType('all');
                  }}
                >
                  Back to Overview
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <LineChart className="mr-2 h-4 w-4" />
                    Refresh Data
                  </>
                )}
              </Button>
            </div>
          </div>

          <TabsContent value="tat" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-ilp-navy" />
              </div>
            ) : trucks.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Data Available</CardTitle>
                  <CardDescription>
                    There are no exited trucks with TAT data to display yet.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : !drillDownView ? (
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>TAT Performance by Material Type</CardTitle>
                    <CardDescription>
                      Comparing actual vs ideal turnaround times by material
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={tatChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <XAxis dataKey="name" />
                          <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                          <Tooltip 
                            formatter={(value, name) => [
                              name === 'ideal' 
                                ? `${formatMinutesToHM(Number(value))}`
                                : `${formatMinutesToHM(Number(value))}`,
                              name === 'ideal' ? 'Ideal TAT' : 'Actual TAT'
                            ]}
                            labelFormatter={(value) => `Material: ${value}`}
                          />
                          <Legend />
                          <Bar 
                            dataKey="ideal" 
                            name="Ideal TAT" 
                            fill="#9ca3af" 
                            onClick={(data) => handleDrillDown(data.name)}
                            cursor="pointer"
                          />
                          <Bar 
                            dataKey="actual" 
                            name="Actual TAT" 
                            fill="#3b82f6" 
                            onClick={(data) => handleDrillDown(data.name)}
                            cursor="pointer"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex items-center justify-center">
                      <p className="text-sm text-gray-500 italic">Click on any bar to see detailed breakdown</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{selectedMaterial} TAT Analysis</CardTitle>
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        <Select
                          value={selectedMaterial}
                          onValueChange={setSelectedMaterial}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="Filter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Materials</SelectItem>
                            <SelectItem value="FG">FG</SelectItem>
                            <SelectItem value="RM">RM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <CardDescription>
                      Turnaround time distribution for {selectedMaterial === 'all' ? 'all materials' : selectedMaterial}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReChartPie>
                          <Pie
                            data={tatDistribution}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {tatDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`${value} trucks`, 'Count']}
                          />
                        </ReChartPie>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between items-center text-sm">
                        <div className="font-semibold">Total Trucks:</div>
                        <div>{filteredTrucks.length}</div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="font-semibold">Ideal TAT:</div>
                        <div>{formatMinutesToHM(getIdealTAT(selectedMaterial))}</div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="font-semibold">Warning Threshold:</div>
                        <div>≥{tatSettings.warningThreshold}% over ideal</div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="font-semibold">Critical Threshold:</div>
                        <div>≥{tatSettings.criticalThreshold}% over ideal</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Truck Details</CardTitle>
                    <CardDescription>
                      Detailed view of trucks with turnaround time metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Truck</TableHead>
                            <TableHead>Material</TableHead>
                            <TableHead>Arrival</TableHead>
                            <TableHead>Exit</TableHead>
                            <TableHead>TAT</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTrucks.slice(0, 10).map((truck) => {
                            const tatMinutes = calculateTATMinutes(truck.arrivalDateTime, truck.exitedAt);
                            const tatStatus = getTATStatus(truck);
                            const statusBadge = getStatusBadge(tatStatus);
                            
                            return (
                              <TableRow key={truck.id}>
                                <TableCell className="font-medium">
                                  {truck.vehicleNumber || truck.truckNumber}
                                </TableCell>
                                <TableCell>{truck.materialType || 'Unknown'}</TableCell>
                                <TableCell>{formatDate(truck.arrivalDateTime)}</TableCell>
                                <TableCell>{formatDate(truck.exitedAt)}</TableCell>
                                <TableCell>{formatMinutesToHM(tatMinutes)}</TableCell>
                                <TableCell>{statusBadge}</TableCell>
                              </TableRow>
                            );
                          })}
                          {filteredTrucks.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-4 text-gray-500 italic">
                                No trucks found for the selected filter
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {filteredTrucks.length > 10 && (
                      <div className="mt-2 text-center text-sm text-gray-500">
                        Showing 10 of {filteredTrucks.length} trucks
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="compliance" className="space-y-4">
            {loadingCompliance ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-ilp-navy" />
              </div>
            ) : approvalRequests.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Data Available</CardTitle>
                  <CardDescription>
                    There are no compliance issues or approval requests to display yet.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : !complianceDrillDown ? (
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Compliance Issues by Category</CardTitle>
                    <CardDescription>
                      Overview of non-compliance issues requiring approval
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={calculateComplianceByType()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="approved" 
                            name="Approved" 
                            stackId="a" 
                            fill="#22c55e" 
                            onClick={(data) => handleComplianceDrillDown(data.name)}
                            cursor="pointer"
                          />
                          <Bar 
                            dataKey="rejected" 
                            name="Rejected" 
                            stackId="a" 
                            fill="#ef4444" 
                            onClick={(data) => handleComplianceDrillDown(data.name)}
                            cursor="pointer"
                          />
                          <Bar 
                            dataKey="pending" 
                            name="Pending" 
                            stackId="a" 
                            fill="#eab308" 
                            onClick={(data) => handleComplianceDrillDown(data.name)}
                            cursor="pointer"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex items-center justify-center">
                      <p className="text-sm text-gray-500 italic">Click on any bar to see detailed breakdown</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Compliance Issues Trend (30 Days)</CardTitle>
                    <CardDescription>
                      Historical trend of non-compliance issues over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReLineChart
                          data={calculateDailyComplianceData()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="documents" 
                            name="Documents" 
                            stroke="#3b82f6" 
                            activeDot={{ r: 8 }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="safety" 
                            name="Safety" 
                            stroke="#f59e0b" 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="weight" 
                            name="Weight" 
                            stroke="#10b981" 
                          />
                        </ReLineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{selectedComplianceType} Issues</CardTitle>
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        <Select
                          value={selectedComplianceType}
                          onValueChange={setSelectedComplianceType}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="Filter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="Documents">Documents</SelectItem>
                            <SelectItem value="Safety">Safety</SelectItem>
                            <SelectItem value="Weight">Weight</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <CardDescription>
                      Status distribution for {selectedComplianceType === 'all' ? 'all issues' : `${selectedComplianceType} issues`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReChartPie>
                          <Pie
                            data={calculateComplianceStatusDistribution()}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {calculateComplianceStatusDistribution().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`${value} issues`, 'Count']}
                          />
                        </ReChartPie>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between items-center text-sm">
                        <div className="font-semibold">Total Issues:</div>
                        <div>{getFilteredApprovalRequests().length}</div>
                      </div>
                      <div className="flex items-center mt-2 gap-2 justify-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                          <span className="text-xs">Approved</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
                          <span className="text-xs">Pending</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                          <span className="text-xs">Rejected</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Compliance Issue Details</CardTitle>
                    <CardDescription>
                      Detailed view of individual non-compliance issues
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Truck</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Requested</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredApprovalRequests().slice(0, 10).map((request) => {
                            const statusBadge = getComplianceStatusBadge(request.status);
                            
                            return (
                              <TableRow key={request.id}>
                                <TableCell className="font-medium">
                                  {request.vehicleNumber || request.truckNumber || 'Unknown'}
                                </TableCell>
                                <TableCell>
                                  {request.type === 'safetyChecks' || request.requestType === 'safetyChecks' ? 'Safety' :
                                   request.requestType === 'weightDiscrepancy' ? 'Weight' : 'Documents'}
                                </TableCell>
                                <TableCell>
                                  {(request.reason || '').length > 30 
                                    ? `${request.reason.substring(0, 30)}...` 
                                    : request.reason || 'Not specified'}
                                </TableCell>
                                <TableCell>
                                  {request.requestedAt ? formatDate(request.requestedAt) : 'Unknown'}
                                </TableCell>
                                <TableCell>{statusBadge}</TableCell>
                              </TableRow>
                            );
                          })}
                          {getFilteredApprovalRequests().length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-gray-500 italic">
                                No compliance issues found for the selected filter
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {getFilteredApprovalRequests().length > 10 && (
                      <div className="mt-2 text-center text-sm text-gray-500">
                        Showing 10 of {getFilteredApprovalRequests().length} issues
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
