import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Scale } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface WeightRecord {
  id: string;
  weightNumber: string;
  materialType: string;
  weight: string;
  createdAt: any;
  recordedBy: string;
  truckId: string;
}

interface WeighBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  truck: any; // TruckCollaboration
  onProcessingComplete: () => void;
}

const WeighBridgeModal = ({ isOpen, onClose, truck, onProcessingComplete }: WeighBridgeModalProps) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [thresholdConfig, setThresholdConfig] = useState<number>(5); // Default 5%
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");

  // Form fields
  const [weightNumber, setWeightNumber] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [weight, setWeight] = useState("");
  const [invoiceWeight, setInvoiceWeight] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // Available weight numbers (1 to 4)
  const availableWeightNumbers = ["1", "2", "3", "4"];
  const materialTypes = ["FG", "PM", "RM"];

  // Fetch existing weight records and threshold config when modal opens
  useEffect(() => {
    if (isOpen && truck?.id) {
      fetchWeightRecords();
      fetchThresholdConfig();
      // Load existing invoice details if they exist
      if (truck.weightData) {
        if (truck.weightData.invoiceNumber) {
          setInvoiceNumber(truck.weightData.invoiceNumber);
        }
        if (truck.weightData.invoiceWeight) {
          setInvoiceWeight(truck.weightData.invoiceWeight.toString());
        }
      }
    }
  }, [isOpen, truck?.id]);

  const fetchWeightRecords = async () => {
    if (!truck?.id) return;
    
    setLoading(true);
    try {
      const weightsRef = collection(db, "weightRecords");
      const q = query(
        weightsRef,
        where("truckId", "==", truck.id),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(q);
      const records: WeightRecord[] = [];
      
      snapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data()
        } as WeightRecord);
      });
      
      setWeightRecords(records);
    } catch (error) {
      console.error("Error fetching weight records:", error);
      toast({
        title: "Error",
        description: "Failed to load weight records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchThresholdConfig = async () => {
    try {
      const settingsRef = doc(db, "organizationSettings", "weighbridgeSettings");
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.weightThresholdPercentage) {
          setThresholdConfig(data.weightThresholdPercentage);
        }
      }
    } catch (error) {
      console.error("Error fetching threshold config:", error);
    }
  };

  const getUsedWeightNumbers = () => {
    return weightRecords.map(record => record.weightNumber);
  };

  const getAvailableWeightNumbers = () => {
    const usedNumbers = getUsedWeightNumbers();
    return availableWeightNumbers.filter(num => !usedNumbers.includes(num));
  };

  const handleRecordWeight = async () => {
    if (!truck?.id || !currentUser) {
      toast({
        title: "Error",
        description: "Missing truck information or user credentials",
        variant: "destructive"
      });
      return;
    }

    if (!weightNumber || !materialType || !weight) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    // Validate weight is a number
    if (isNaN(Number(weight)) || Number(weight) <= 0) {
      toast({
        title: "Invalid weight",
        description: "Please enter a valid weight in kg",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Add weight record to Firestore
      const weightData = {
        weightNumber,
        materialType,
        weight,
        createdAt: serverTimestamp(),
        recordedBy: currentUser.uid,
        truckId: truck.id,
        truckNumber: truck.truckNumber,
        vehicleNumber: truck.vehicleNumber
      };

      await addDoc(collection(db, "weightRecords"), weightData);
      
      // Update truck record with the weight information
      const truckRef = doc(db, "transporterCollaborations", truck.id);
      await updateDoc(truckRef, {
        [`weightData.weight${weightNumber}`]: {
          weight: weight,
          materialType: materialType,
          recordedAt: serverTimestamp(),
          recordedBy: currentUser.uid
        },
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      });

      toast({
        title: "Success",
        description: `Weight #${weightNumber} recorded successfully`,
      });

      // Reset form fields
      setWeightNumber("");
      setMaterialType("");
      setWeight("");

      // Refresh weight records
      fetchWeightRecords();
    } catch (error) {
      console.error("Error recording weight:", error);
      toast({
        title: "Error",
        description: "Failed to record weight",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate total weights and summary information
  const getWeightSummary = () => {
    if (!truck?.weightData) return { count: 0, total: 0, average: 0 };
    
    // Filter to get only weight entries (keys that start with 'weight')
    const weightEntries = Object.entries(truck.weightData)
      .filter(([key]) => key.startsWith('weight'))
      .map(([_, value]: [string, any]) => Number(value.weight));
    
    const total = weightEntries.reduce((sum, w) => sum + w, 0);
    
    return {
      count: weightEntries.length,
      total: total,
      average: weightEntries.length > 0 ? Math.round(total / weightEntries.length) : 0
    };
  };
  
  const weightSummary = getWeightSummary();

  // Force refresh truck data when approval status might have changed
  const refreshTruckData = async () => {
    if (!truck?.id) return;
    
    try {
      const truckRef = doc(db, "transporterCollaborations", truck.id);
      const truckDoc = await getDoc(truckRef);
      
      if (truckDoc.exists()) {
        // Notify parent component to refresh data
        onProcessingComplete();
      }
    } catch (error) {
      console.error("Error refreshing truck data:", error);
    }
  };

  // Check for approval status changes when modal opens
  useEffect(() => {
    if (isOpen && truck?.id && truck?.weightData?.approvalStatus) {
      refreshTruckData();
    }
  }, [isOpen, truck?.id, truck?.weightData?.approvalStatus]);

  // Calculate weight difference percentage based on average weight
  const calculateWeightDifference = () => {
    if (!invoiceWeight || invoiceWeight === '0' || weightSummary.average === 0) return null;
    
    const invWeight = parseFloat(invoiceWeight);
    const averageWeight = weightSummary.average;
    const difference = Math.abs(invWeight - averageWeight);
    const percentageDiff = (difference / invWeight) * 100;
    
    return {
      difference,
      percentageDiff: parseFloat(percentageDiff.toFixed(2)),
      exceedsThreshold: percentageDiff > thresholdConfig
    };
  };

  const weightDifference = calculateWeightDifference();

  // Submit for approval
  const submitForApproval = async () => {
    if (!truck?.id || !currentUser || !approvalReason) {
      return;
    }

    setSubmitting(true);
    try {
      // Create approval request
      await addDoc(collection(db, "approvalRequests"), {
        requestType: "weightDiscrepancy",
        truckId: truck.id,
        truckNumber: truck.truckNumber,
        vehicleNumber: truck.vehicleNumber,
        requestedBy: currentUser.uid,
        requestedAt: serverTimestamp(),
        status: "pending",
        reason: approvalReason,
        invoiceWeight: parseFloat(invoiceWeight),
        actualWeight: weightSummary.average, // Using average instead of total
        averageWeight: weightSummary.average,
        totalWeight: weightSummary.total,
        weightCount: weightSummary.count,
        difference: weightDifference?.difference || 0,
        percentageDiff: weightDifference?.percentageDiff || 0,
        threshold: thresholdConfig
      });

      // Update truck record
      const truckRef = doc(db, "transporterCollaborations", truck.id);
      await updateDoc(truckRef, {
        "weightData.invoiceWeight": invoiceWeight,
        "weightData.invoiceNumber": invoiceNumber,
        "weightData.averageWeight": weightSummary.average,
        "weightData.totalWeight": weightSummary.total,
        "weightData.weightCount": weightSummary.count,
        "weightData.differencePercentage": weightDifference?.percentageDiff || 0,
        "weightData.withinThreshold": false,
        "weightData.approvalStatus": "pending",
        "weightData.approvalRequestedAt": serverTimestamp(),
        "weightData.approvalRequestedBy": currentUser.uid,
        "weightData.lastCalculatedAt": serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      });

      toast({
        title: "Success",
        description: "Weight discrepancy approval request submitted successfully",
      });

      setIsRequestingApproval(false);
      onProcessingComplete();
      onClose();
    } catch (error) {
      console.error("Error submitting approval request:", error);
      toast({
        title: "Error",
        description: "Failed to submit approval request",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Save invoice weight without approval (when within threshold)
  const saveInvoiceWeight = async () => {
    if (!truck?.id || !currentUser || !invoiceWeight || !invoiceNumber) {
      toast({
        title: "Missing information",
        description: "Please enter invoice weight and number",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const truckRef = doc(db, "transporterCollaborations", truck.id);
      await updateDoc(truckRef, {
        "weightData.invoiceWeight": invoiceWeight,
        "weightData.invoiceNumber": invoiceNumber,
        "weightData.averageWeight": weightSummary.average,
        "weightData.totalWeight": weightSummary.total,
        "weightData.weightCount": weightSummary.count,
        "weightData.differencePercentage": weightDifference?.percentageDiff || 0,
        "weightData.withinThreshold": true,
        "weightData.approvalStatus": "notRequired",
        "weightData.lastCalculatedAt": serverTimestamp(),
        weighbridgeProcessingComplete: true,
        weighbridgeProcessedAt: serverTimestamp(),
        weighbridgeProcessedBy: currentUser.uid,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      });

      toast({
        title: "Success",
        description: "Invoice weight recorded successfully",
      });

      onProcessingComplete();
      onClose();
    } catch (error) {
      console.error("Error saving invoice weight:", error);
      toast({
        title: "Error",
        description: "Failed to save invoice weight",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const completeProcessing = async () => {
    if (!truck?.id || !currentUser) return;
    
    if (weightRecords.length === 0) {
      toast({
        title: "No weights recorded",
        description: "Please record at least one weight measurement",
        variant: "destructive"
      });
      return;
    }

    // If invoice weight is provided and exceeds threshold, request approval
    if (invoiceWeight && invoiceNumber && weightDifference?.exceedsThreshold) {
      setIsRequestingApproval(true);
      return;
    }
    
    // If invoice weight is provided and within threshold, save it
    if (invoiceWeight && invoiceNumber) {
      await saveInvoiceWeight();
      return;
    }
    
    // Otherwise just complete the weighbridge processing
    setSubmitting(true);
    try {
      const truckRef = doc(db, "transporterCollaborations", truck.id);
      
      // Mark weighbridge processing as complete
      await updateDoc(truckRef, {
        weighbridgeProcessingComplete: true,
        weighbridgeProcessedAt: serverTimestamp(),
        weighbridgeProcessedBy: currentUser.uid,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      });
      
      toast({
        title: "Processing complete",
        description: "Weighbridge processing has been completed",
      });
      
      onProcessingComplete();
      onClose();
    } catch (error) {
      console.error("Error completing weighbridge processing:", error);
      toast({
        title: "Error",
        description: "Failed to complete weighbridge processing",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    
    try {
      // Handle Firestore timestamp objects
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        return format(dateValue.toDate(), "MMM d, yyyy h:mm a");
      }
      
      // Handle string dates
      return format(new Date(dateValue), "MMM d, yyyy h:mm a");
    } catch (error) {
      return String(dateValue) || 'Invalid date';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-600" />
            Weigh Bridge - {truck?.truckNumber || "Unknown Truck"}
          </DialogTitle>
        </DialogHeader>
        
        {/* Truck Info Header with Weight Status */}
        <div className="bg-blue-50 p-4 rounded-md mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Truck Details</h3>
            <div className="flex items-center gap-2">
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded border border-green-400">
                {truck?.status || 'Inside'}
              </span>
              {truck?.weightData?.approvalStatus && (
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded border ${
                  truck.weightData.approvalStatus === 'approved' 
                    ? 'bg-green-100 text-green-800 border-green-400'
                    : truck.weightData.approvalStatus === 'rejected'
                      ? 'bg-red-100 text-red-800 border-red-400'
                      : truck.weightData.approvalStatus === 'pending'
                        ? 'bg-amber-100 text-amber-800 border-amber-400'
                        : 'bg-blue-100 text-blue-800 border-blue-400'
                }`}>
                  {truck.weightData.approvalStatus === 'approved' 
                    ? 'Approved' 
                    : truck.weightData.approvalStatus === 'rejected'
                      ? 'Rejected'
                      : truck.weightData.approvalStatus === 'pending'
                        ? 'Approval Pending'
                        : 'Not Required'}
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Truck Number:</span>
              <p className="text-sm text-gray-900">{truck?.truckNumber || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Vehicle Number:</span>
              <p className="text-sm text-gray-900">{truck?.vehicleNumber || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Driver Name:</span>
              <p className="text-sm text-gray-900">{truck?.driverName || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Driver Mobile:</span>
              <p className="text-sm text-gray-900">{truck?.driverMobile || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">RTO Capacity:</span>
              <p className="text-sm text-gray-900">{truck?.rtoCapacity || 'N/A'} Tonnes</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Loading Capacity:</span>
              <p className="text-sm text-gray-900">{truck?.loadingCapacity || 'N/A'} Tonnes</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Transporter:</span>
              <p className="text-sm text-gray-900">{truck?.transporter || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Arrival Date/Time:</span>
              <p className="text-sm text-gray-900">{formatDate(truck?.arrivalDateTime)}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Material Type:</span>
              <p className="text-sm text-gray-900">{truck?.materialType || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Supplier Name:</span>
              <p className="text-sm text-gray-900">{truck?.supplierName || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">LR Number:</span>
              <p className="text-sm text-gray-900">{truck?.lrNumber || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Depot Name:</span>
              <p className="text-sm text-gray-900">{truck?.depotName || 'N/A'}</p>
            </div>
            {truck?.isTransshipment && (
              <div>
                <span className="text-sm font-medium text-gray-500">Type:</span>
                <p className="text-sm text-blue-600 font-medium">Transshipment</p>
              </div>
            )}
            
            {/* Show invoice and weight details prominently if they exist */}
            {truck?.weightData?.invoiceWeight && (
              <div className="md:col-span-3 mt-3 p-3 bg-amber-50 rounded-md border border-amber-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Invoice Weight:</span>
                    <p className="text-sm font-bold text-gray-900">{truck.weightData.invoiceWeight} kg</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Invoice Number:</span>
                    <p className="text-sm font-bold text-gray-900">{truck.weightData.invoiceNumber || 'N/A'}</p>
                  </div>
                  {truck.weightData.averageWeight && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Average Weight:</span>
                      <p className="text-sm font-bold text-gray-900">{truck.weightData.averageWeight} kg</p>
                    </div>
                  )}
                  {truck.weightData.differencePercentage > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Difference:</span>
                      <p className={`text-sm font-bold ${truck.weightData.differencePercentage > thresholdConfig ? 'text-red-600' : 'text-green-600'}`}>
                        {truck.weightData.differencePercentage}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Weight Summary - Keep this and make more prominent */}
        {weightSummary.count > 0 && (
          <div className="mb-6 bg-amber-50 p-4 rounded-md border border-amber-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Weightment Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-md border border-amber-100">
                <p className="text-sm text-gray-500">Total Weights</p>
                <p className="text-xl font-bold text-amber-700">{weightSummary.count} weight(s)</p>
              </div>
              <div className="bg-white p-3 rounded-md border border-amber-100">
                <p className="text-sm text-gray-500">Total Weight</p>
                <p className="text-xl font-bold text-amber-700">{weightSummary.total.toLocaleString()} kg</p>
              </div>
              <div className="bg-white p-3 rounded-md border border-amber-100 relative overflow-hidden">
                <div className={invoiceWeight && weightDifference ? (
                  weightDifference.exceedsThreshold 
                    ? "absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-red-500"
                    : "absolute top-0 right-0 w-0 h-0 border-t-[25px] border-r-[25px] border-t-transparent border-r-green-500"
                ) : ""} />
                <p className="text-sm text-gray-500">Average Weight</p>
                <p className="text-xl font-bold text-amber-700">{weightSummary.average.toLocaleString()} kg</p>
                
                {invoiceWeight && weightDifference && (
                  <div className="mt-2 pt-2 border-t border-amber-100">
                    <p className="text-xs text-gray-500">Compared to Invoice</p>
                    <p className={`text-sm font-medium ${weightDifference.exceedsThreshold ? 'text-red-600' : 'text-green-600'}`}>
                      Diff: {weightDifference.percentageDiff}% {weightDifference.exceedsThreshold ? '⚠️' : '✅'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Weight Recording Form */}
        <div className="border rounded-md p-4 mb-6">
          <h3 className="font-medium text-lg mb-4">Record Weight</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label htmlFor="weightNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Weight Number
              </label>
              <Select
                value={weightNumber}
                onValueChange={setWeightNumber}
                disabled={getAvailableWeightNumbers().length === 0}
              >
                <SelectTrigger id="weightNumber">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableWeightNumbers().map((num) => (
                    <SelectItem key={num} value={num}>Weight {num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="materialType" className="block text-sm font-medium text-gray-700 mb-1">
                Material Type
              </label>
              <Select
                value={materialType}
                onValueChange={setMaterialType}
              >
                <SelectTrigger id="materialType">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {materialTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                Enter Weight
              </label>
              <Input
                id="weight"
                type="number"
                placeholder="Weight in kg"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleRecordWeight} 
                disabled={submitting || !weightNumber || !materialType || !weight}
                className="w-full"
              >
                Record Weight
              </Button>
            </div>
          </div>

          <p className="text-sm text-gray-500 italic mt-2">
            {getAvailableWeightNumbers().length === 0 
              ? "Maximum of 4 weight records have been added for this truck" 
              : `You can add ${getAvailableWeightNumbers().length} more weight record(s) for this truck`
            }
          </p>
        </div>
        
        {/* Invoice Weight Section (only show once at least one weight is recorded) */}
        {weightSummary.count > 0 && (
          <div className="border rounded-md p-4 mb-6">
            <h3 className="font-medium text-lg mb-4">Invoice Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <Input
                  id="invoiceNumber"
                  type="text"
                  placeholder="Enter invoice number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="invoiceWeight" className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Weight (kg)
                </label>
                <Input
                  id="invoiceWeight"
                  type="number"
                  placeholder="Enter invoice weight"
                  value={invoiceWeight}
                  onChange={(e) => setInvoiceWeight(e.target.value)}
                />
              </div>
            </div>

            {invoiceWeight && weightDifference && (
              <div className={`p-3 rounded-md mt-2 ${weightDifference.exceedsThreshold ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">
                      Average Weight Difference: {weightDifference.difference.toLocaleString()} kg ({weightDifference.percentageDiff}%)
                    </span>
                    <p className="text-xs mt-1">
                      {weightDifference.exceedsThreshold 
                        ? `⚠️ Average weight exceeds threshold of ${thresholdConfig}%. Approval required.` 
                        : `✅ Average weight within threshold of ${thresholdConfig}%.`}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Average: {weightSummary.average.toLocaleString()} kg</span>
                    <br/>
                    <span className="text-sm font-medium">Invoice: {parseFloat(invoiceWeight).toLocaleString()} kg</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Weight History Table */}
        <div>
          <h3 className="font-medium text-lg mb-4">Weight History</h3>
          
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : weightRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weightment No</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material Type</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {weightRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.weightNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {record.materialType}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {record.weight} KG
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No weight records found for this truck
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          
          <Button 
            onClick={completeProcessing}
            disabled={submitting || weightRecords.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {submitting ? "Processing..." : "Submit"}
          </Button>
        </DialogFooter>

        {/* Approval Request Dialog */}
        {isRequestingApproval && (
          <Dialog open={isRequestingApproval} onOpenChange={setIsRequestingApproval}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Request Weight Discrepancy Approval</DialogTitle>
              </DialogHeader>
              
              <div className="bg-amber-50 p-3 rounded-md mb-4">
                <p className="text-sm font-medium text-amber-800">
                  Average weight difference of {weightDifference?.percentageDiff}% exceeds the threshold of {thresholdConfig}%.
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Average Weight: {weightSummary.average.toLocaleString()} kg | Invoice: {parseFloat(invoiceWeight).toLocaleString()} kg
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  Total Weight: {weightSummary.total.toLocaleString()} kg | Weight Count: {weightSummary.count}
                </p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="approvalReason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Approval Request
                </label>
                <Textarea
                  id="approvalReason"
                  placeholder="Explain the reason for the weight discrepancy..."
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  rows={4}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsRequestingApproval(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={submitForApproval}
                  disabled={submitting || !approvalReason}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Request Approval
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WeighBridgeModal; 