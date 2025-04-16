import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProcessingFormData } from "../TruckProcessingModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, AlertTriangle, CheckCircle2, XCircle, Loader2, SendIcon, ShieldAlert } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface VehicleCheckStepProps {
  formData: ProcessingFormData;
  updateFormData: (data: Partial<ProcessingFormData>) => void;
  truck: any; // TruckCollaboration | null
}

interface SafetyCheck {
  name: string;
  description: string;
  response: "Yes" | "No";
  status: "PASS" | "FAIL";
}

interface SafetyEquipment {
  wheelChokeAvailable: number;
  safetyShoeAvailable: number;
  wheelChokeCount: number;
  safetyShoeCount: number;
  issuedWheelChokes: number;
  issuedSafetyShoes: number;
}

const VehicleCheckStep = ({ formData, updateFormData, truck }: VehicleCheckStepProps) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const isInitialMount = useRef(true);
  
  // Safety equipment inventory
  const [safetyEquipment, setSafetyEquipment] = useState<SafetyEquipment>({
    wheelChokeAvailable: 0,
    safetyShoeAvailable: 0,
    wheelChokeCount: 0,
    safetyShoeCount: 0,
    issuedWheelChokes: 0,
    issuedSafetyShoes: 0
  });
  
  // Wheel choke and safety shoe counts to issue
  const [wheelChokeToIssue, setWheelChokeToIssue] = useState("");
  const [safetyShoeToIssue, setSafetyShoeToIssue] = useState("");
  const [wheelChokeRemarks, setWheelChokeRemarks] = useState("");
  const [safetyShoeRemarks, setSafetyShoeRemarks] = useState("");
  
  // Check if equipment has already been issued to this truck
  const [equipmentIssued, setEquipmentIssued] = useState({
    wheelChoke: false,
    safetyShoe: false
  });

  // Handler for standard checkbox changes
  const handleCheckboxChange = (field: keyof ProcessingFormData, checked: boolean) => {
    updateFormData({ [field]: checked });
  };

  // Initialize safety checks
  const [safetyChecks, setSafetyChecks] = useState<SafetyCheck[]>([
    { 
      name: "Alcohol Check", 
      description: "Driver alcohol testing",
      response: "No",
      status: "FAIL"
    },
    { 
      name: "Remove all flammable items", 
      description: "Check and remove any flammable materials",
      response: "No",
      status: "FAIL"
    },
    { 
      name: "Ensure Spark arrestor for Hazardous goods", 
      description: "Verify spark arrestor is installed correctly",
      response: "No",
      status: "FAIL"
    },
    { 
      name: "Respect & Ensure speed limit", 
      description: "Confirm driver understands speed limits", 
      response: "No",
      status: "FAIL"
    },
    { 
      name: "Do not overload check", 
      description: "Verify truck is not overloaded",
      response: "No",
      status: "FAIL"
    },
    { 
      name: "Ensure vehicle tyres, head lights, indicators, etc.", 
      description: "Check all vehicle lights and indicators are functional",
      response: "No",
      status: "FAIL"
    }
  ]);
  
  // Handle safety check response changes
  const handleSafetyCheckResponseChange = async (index: number, response: "Yes" | "No") => {
    // Update the local state first
    const updatedChecks = [...safetyChecks];
    updatedChecks[index].response = response;
    updatedChecks[index].status = response === "Yes" ? "PASS" : "FAIL";
    setSafetyChecks(updatedChecks);
    
    // Directly update the form data
    const allPassed = updatedChecks.every(check => check.status === "PASS");
    updateFormData({
      safetyChecks: updatedChecks,
      allSafetyChecksPassed: allPassed
    });
    
    // If truck ID is available, update Firestore directly 
    if (truck?.id && currentUser) {
      try {
        const truckRef = doc(db, "transporterCollaborations", truck.id);
        await updateDoc(truckRef, {
          "processingDraft.safetyChecks": updatedChecks,
          "processingDraft.allSafetyChecksPassed": allPassed,
          lastUpdatedAt: serverTimestamp(),
          lastUpdatedBy: currentUser.uid
        });
      } catch (error) {
        console.error("Error updating safety check in Firestore:", error);
      }
    }
  };
  
  // Check if any safety checks failed and need approval
  const allSafetyChecksPassed = safetyChecks.every(check => check.status === "PASS");
  
  // Check if already pending approval
  const isPendingApproval = formData.safetyChecksPendingApproval;
  const isExceptionallyApproved = formData.safetyChecksExceptionallyApproved;
  
  // Send for approval
  const handleSendForApproval = async () => {
    if (!currentUser || !truck) return;
    
    try {
      // Update truck processing data in form
      updateFormData({ 
        safetyChecksPendingApproval: true,
        safetyCheckApprovalReason: formData.vehicleRemarks,
        safetyChecks: safetyChecks
      });
      
      // Update the truck document directly to ensure the data is persisted
      const truckRef = doc(db, "transporterCollaborations", truck.id);
      await updateDoc(truckRef, {
        "processingDraft.safetyChecks": safetyChecks,
        "processingDraft.allSafetyChecksPassed": allSafetyChecksPassed,
        "processingDraft.safetyChecksPendingApproval": true,
        "processingDraft.safetyCheckApprovalReason": formData.vehicleRemarks,
        "processingDraft.vehicleRemarks": formData.vehicleRemarks,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      });
      
      // Create approval request
      await addDoc(collection(db, "approvalRequests"), {
        truckId: truck.id,
        vehicleNumber: truck.vehicleNumber,
        driverName: truck.driverName,
        requestedBy: currentUser.uid,
        requestedAt: serverTimestamp(),
        reason: formData.vehicleRemarks,
        status: "pending",
        type: "safetyChecks",
        safetyChecks: safetyChecks // Include the actual safety checks data in the approval request
      });
      
      toast({
        title: "Approval Requested",
        description: "The truck has been sent for exceptional approval of safety checks."
      });
    } catch (error) {
      console.error("Error creating approval request:", error);
      toast({
        title: "Error",
        description: "Failed to request approval. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Update safety checks in form data when changes occur
  useEffect(() => {
    // Only update if there are actual changes to the safety checks
    updateFormData({
      safetyChecks: safetyChecks,
      allSafetyChecksPassed: allSafetyChecksPassed
    });
  }, [safetyChecks]);
  
  // Fetch safety equipment inventory
  useEffect(() => {
    fetchSafetyEquipmentInventory();
    if (truck?.id) {
      checkEquipmentIssuedStatus();
    }
  }, [truck?.id]);
  
  // Initialize safety checks from form data if available
  useEffect(() => {
    if (formData.safetyChecks && formData.safetyChecks.length > 0) {
      // Set safety checks from existing form data
      setSafetyChecks(formData.safetyChecks);
    }
  }, []);
  
  const fetchSafetyEquipmentInventory = async () => {
    try {
      setIsLoading(true);
      const safetyEquipmentRef = doc(db, "settings", "safetyEquipment");
      const docSnap = await getDoc(safetyEquipmentRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSafetyEquipment({
          wheelChokeCount: data.wheelChokeCount || 0,
          safetyShoeCount: data.safetyShoeCount || 0,
          issuedWheelChokes: data.issuedWheelChokes || 0,
          issuedSafetyShoes: data.issuedSafetyShoes || 0,
          wheelChokeAvailable: (data.wheelChokeCount || 0) - (data.issuedWheelChokes || 0),
          safetyShoeAvailable: (data.safetyShoeCount || 0) - (data.issuedSafetyShoes || 0)
        });
      }
    } catch (error) {
      console.error("Error fetching safety equipment inventory:", error);
      toast({
        title: "Error",
        description: "Failed to load safety equipment data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if equipment has been issued to this truck
  const checkEquipmentIssuedStatus = async () => {
    if (!truck?.id) return;
    
    try {
      const truckRef = doc(db, "transporterCollaborations", truck.id);
      const truckDoc = await getDoc(truckRef);
      
      if (truckDoc.exists()) {
        const data = truckDoc.data();
        
        setEquipmentIssued({
          wheelChoke: !!data.issuedWheelChoke,
          safetyShoe: !!data.issuedSafetyShoe
        });
        
        // If equipment was already issued, set the values in the form
        if (data.issuedWheelChoke) {
          setWheelChokeToIssue(data.issuedWheelChoke.quantity || "");
          setWheelChokeRemarks(data.issuedWheelChoke.remarks || "");
        }
        
        if (data.issuedSafetyShoe) {
          setSafetyShoeToIssue(data.issuedSafetyShoe.quantity || "");
          setSafetyShoeRemarks(data.issuedSafetyShoe.remarks || "");
        }
      }
    } catch (error) {
      console.error("Error checking equipment issued status:", error);
    }
  };
  
  // Update form data and issue equipment automatically when input changes
  const handleEquipmentInputChange = async (field: 'wheelChoke' | 'safetyShoe', value: string, remarkField: 'wheelChokeRemarks' | 'safetyShoeRemarks', remarkValue: string) => {
    // Check if the value has actually changed before proceeding
    if (field === 'wheelChoke') {
      // Only update if there's an actual change
      if (value === wheelChokeToIssue) return;
      
      setWheelChokeToIssue(value);
      // Update the form data with entered values
      updateEquipmentInFormData(field, value, remarkValue);
    } else {
      // Only update if there's an actual change
      if (value === safetyShoeToIssue) return;
      
      setSafetyShoeToIssue(value);
      // Update the form data with entered values
      updateEquipmentInFormData(field, value, remarkValue);
    }
  };
  
  const handleRemarksChange = (field: 'wheelChokeRemarks' | 'safetyShoeRemarks', value: string) => {
    if (field === 'wheelChokeRemarks') {
      // Only update if there's an actual change
      if (value === wheelChokeRemarks) return;
      
      setWheelChokeRemarks(value);
      updateEquipmentInFormData('wheelChoke', wheelChokeToIssue, value);
    } else {
      // Only update if there's an actual change
      if (value === safetyShoeRemarks) return;
      
      setSafetyShoeRemarks(value);
      updateEquipmentInFormData('safetyShoe', safetyShoeToIssue, value);
    }
  };
  
  // Update form data with equipment information
  const updateEquipmentInFormData = (field: 'wheelChoke' | 'safetyShoe', quantity: string, remarks: string) => {
    const qty = parseInt(quantity) || 0;
    let data: Partial<ProcessingFormData> = {};
    
    if (field === 'wheelChoke') {
      // Validate quantity
      if (qty > safetyEquipment.wheelChokeAvailable) {
        toast({
          title: "Warning",
          description: "Cannot issue more wheel chokes than available.",
          variant: "destructive"
        });
        return;
      }
      
      data.issuedWheelChoke = qty > 0 ? {
        quantity: qty.toString(),
        remarks: remarks
      } : null;
      
      setEquipmentIssued(prev => ({
        ...prev,
        wheelChoke: qty > 0
      }));
    } else {
      // Validate quantity
      if (qty > safetyEquipment.safetyShoeAvailable) {
        toast({
          title: "Warning",
          description: "Cannot issue more safety shoes than available.",
          variant: "destructive"
        });
        return;
      }
      
      data.issuedSafetyShoe = qty > 0 ? {
        quantity: qty.toString(),
        remarks: remarks
      } : null;
      
      setEquipmentIssued(prev => ({
        ...prev,
        safetyShoe: qty > 0
      }));
    }
    
    // Update form data
    updateFormData(data);
    
    // If truck ID is available, also update Firestore directly for both the truck record and processing draft
    if (truck?.id && currentUser) {
      try {
        const truckRef = doc(db, "transporterCollaborations", truck.id);
        
        // Update both the main truck record and the processing draft
        if (field === 'wheelChoke') {
          updateDoc(truckRef, {
            "processingDraft.issuedWheelChoke": data.issuedWheelChoke,
            "issuedWheelChoke": data.issuedWheelChoke, // Also update at the root level
            lastUpdatedAt: serverTimestamp(),
            lastUpdatedBy: currentUser.uid
          });
        } else {
          updateDoc(truckRef, {
            "processingDraft.issuedSafetyShoe": data.issuedSafetyShoe,
            "issuedSafetyShoe": data.issuedSafetyShoe, // Also update at the root level
            lastUpdatedAt: serverTimestamp(),
            lastUpdatedBy: currentUser.uid
          });
        }
      } catch (error) {
        console.error(`Error updating ${field} in Firestore:`, error);
      }
    }
  };
  
  // Helper to synchronize equipment data with Firebase when form is saved
  // This will be called by the parent component through updateFormData
  useEffect(() => {
    // Trigger when form data for issued equipment changes
    if (!truck?.id || !currentUser) return;
    
    // Skip the effect on initial mount to prevent auto-issuing equipment
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const syncEquipmentWithFirebase = async () => {
      try {
        const wheelChokeQty = formData.issuedWheelChoke ? parseInt(formData.issuedWheelChoke.quantity) || 0 : 0;
        const safetyShoeQty = formData.issuedSafetyShoe ? parseInt(formData.issuedSafetyShoe.quantity) || 0 : 0;
        
        // Calculate differences from previously issued equipment
        const truckRef = doc(db, "transporterCollaborations", truck.id);
        const truckDoc = await getDoc(truckRef);
        
        let wheelChokeDiff = 0;
        let safetyShowDiff = 0;
        
        if (truckDoc.exists()) {
          const data = truckDoc.data();
          
          // Calculate difference from current values in Firestore
          const existingWheelChokes = data.issuedWheelChoke ? parseInt(data.issuedWheelChoke.quantity) || 0 : 0;
          const existingSafetyShoes = data.issuedSafetyShoe ? parseInt(data.issuedSafetyShoe.quantity) || 0 : 0;
          
          wheelChokeDiff = wheelChokeQty - existingWheelChokes;
          safetyShowDiff = safetyShoeQty - existingSafetyShoes;
        } else {
          wheelChokeDiff = wheelChokeQty;
          safetyShowDiff = safetyShoeQty;
        }
        
        // Only proceed if there's an actual change in equipment quantities
        if (wheelChokeDiff !== 0 || safetyShowDiff !== 0) {
          // Update truck record with equipment data
          const equipmentData: any = {};
          
          if (wheelChokeQty > 0) {
            equipmentData.issuedWheelChoke = {
              quantity: wheelChokeQty.toString(),
              remarks: formData.issuedWheelChoke?.remarks || "",
              issuedBy: currentUser.uid,
              issuedAt: serverTimestamp()
            };
            // Also update in processingDraft
            equipmentData["processingDraft.issuedWheelChoke"] = equipmentData.issuedWheelChoke;
          }
          
          if (safetyShoeQty > 0) {
            equipmentData.issuedSafetyShoe = {
              quantity: safetyShoeQty.toString(),
              remarks: formData.issuedSafetyShoe?.remarks || "",
              issuedBy: currentUser.uid,
              issuedAt: serverTimestamp()
            };
            // Also update in processingDraft
            equipmentData["processingDraft.issuedSafetyShoe"] = equipmentData.issuedSafetyShoe;
          }
          
          // Update the truck document
          await updateDoc(truckRef, {
            ...equipmentData,
            lastUpdatedAt: serverTimestamp(),
            lastUpdatedBy: currentUser.uid
          });
          
          // Update safety equipment inventory in settings
          if (wheelChokeDiff !== 0 || safetyShowDiff !== 0) {
            const safetyEquipmentRef = doc(db, "settings", "safetyEquipment");
            
            // Only update fields that have changed
            const updateData: any = {
              lastUpdated: serverTimestamp(),
              lastUpdatedBy: currentUser.uid
            };
            
            if (wheelChokeDiff !== 0) {
              updateData.issuedWheelChokes = increment(wheelChokeDiff);
            }
            
            if (safetyShowDiff !== 0) {
              updateData.issuedSafetyShoes = increment(safetyShowDiff);
            }
            
            await updateDoc(safetyEquipmentRef, updateData);
            
            // Log the equipment issuance for tracking
            await addDoc(collection(db, "equipmentIssuanceLogs"), {
              truckId: truck.id,
              vehicleNumber: truck.vehicleNumber,
              wheelChokesIssued: wheelChokeDiff,
              safetyShoeIssued: safetyShowDiff,
              issuedBy: currentUser.uid,
              issuedAt: serverTimestamp(),
              remarks: `Wheel Chokes: ${formData.issuedWheelChoke?.remarks || ""}, Safety Shoes: ${formData.issuedSafetyShoe?.remarks || ""}`
            });
            
            // Show a success message
            if (wheelChokeDiff > 0 || safetyShowDiff > 0) {
              toast({
                title: "Equipment Issued",
                description: `Successfully issued ${wheelChokeDiff > 0 ? wheelChokeDiff + ' wheel chokes' : ''} ${wheelChokeDiff > 0 && safetyShowDiff > 0 ? 'and ' : ''} ${safetyShowDiff > 0 ? safetyShowDiff + ' safety shoes' : ''}`,
              });
            }
            
            // Refresh inventory counts
            fetchSafetyEquipmentInventory();
          }
        }
      } catch (error) {
        console.error("Error syncing equipment data:", error);
        toast({
          title: "Error",
          description: "Failed to update safety equipment inventory. Please try again.",
          variant: "destructive"
        });
      }
    };
    
    // Sync equipment data with Firebase
    syncEquipmentWithFirebase();
  }, [formData.issuedWheelChoke, formData.issuedSafetyShoe]);

  // Handler for updating vehicle remarks
  const handleVehicleRemarksChange = async (value: string) => {
    // Update form data with the new remarks
    updateFormData({ vehicleRemarks: value });
    
    // If truck ID is available, update Firestore directly
    if (truck?.id && currentUser) {
      try {
        const truckRef = doc(db, "transporterCollaborations", truck.id);
        await updateDoc(truckRef, {
          "processingDraft.vehicleRemarks": value,
          lastUpdatedAt: serverTimestamp(),
          lastUpdatedBy: currentUser.uid
        });
      } catch (error) {
        console.error("Error updating vehicle remarks in Firestore:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Vehicle Condition Inspection</AlertTitle>
        <AlertDescription>
          Thoroughly inspect the vehicle and assess its condition before allowing entry.
        </AlertDescription>
      </Alert>
      
      {/* Approval Status Alerts */}
      {isPendingApproval && (
        <Alert className="bg-amber-50 text-amber-800 border-amber-300">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Pending Approval</AlertTitle>
          <AlertDescription>
            This truck's safety checks are pending exceptional approval from a manager.
          </AlertDescription>
        </Alert>
      )}
      
      {isExceptionallyApproved && (
        <Alert className="bg-blue-50 text-blue-800 border-blue-300">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Exceptionally Approved</AlertTitle>
          <AlertDescription>
            This truck's safety checks have been exceptionally approved despite failures.
          </AlertDescription>
        </Alert>
      )}
      
      {!allSafetyChecksPassed && !isExceptionallyApproved && !isPendingApproval && (
        <Alert className="bg-red-50 text-red-800 border-red-300">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Failed Safety Checks</AlertTitle>
          <AlertDescription>
            Some safety checks have failed. You cannot proceed to the next step until all checks pass or are exceptionally approved.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Truck Details Section */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Truck Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
      </div>
      
      {/* Safety Checks Table */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Safety Checks</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checks</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {safetyChecks.map((check, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-500">
                    {check.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Select
                      value={check.response}
                      onValueChange={(value) => handleSafetyCheckResponseChange(index, value as "Yes" | "No")}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isExceptionallyApproved && check.status === "FAIL" ? (
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Approved
                        </span>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        check.status === "PASS" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {check.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Issue Wheel Choke and Safety Shoes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 border rounded-md">
          <div className="flex justify-between mb-2">
            <h3 className="text-md font-medium">Issue Wheel Choke</h3>
            <div className="text-green-600 text-sm">
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Loading...
                </span>
              ) : (
                <>Available: {safetyEquipment.wheelChokeAvailable}</>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <input 
              type="text" 
              placeholder="Enter count" 
              className="w-full p-2 border rounded"
              value={wheelChokeToIssue}
              onChange={(e) => handleEquipmentInputChange('wheelChoke', e.target.value, 'wheelChokeRemarks', wheelChokeRemarks)}
            />
            <input 
              type="text" 
              placeholder="Enter remarks/id" 
              className="w-full p-2 border rounded"
              value={wheelChokeRemarks}
              onChange={(e) => handleRemarksChange('wheelChokeRemarks', e.target.value)}
            />
            {equipmentIssued.wheelChoke && (
              <div className="mt-1 text-sm text-green-600 flex items-center">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Equipment will be issued on save/next
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border rounded-md">
          <div className="flex justify-between mb-2">
            <h3 className="text-md font-medium">Issue Safety Shoes</h3>
            <div className="text-green-600 text-sm">
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Loading...
                </span>
              ) : (
                <>Available: {safetyEquipment.safetyShoeAvailable}</>
              )}
            </div>
              </div>
          <div className="space-y-2">
            <input 
              type="text" 
              placeholder="Enter count" 
              className="w-full p-2 border rounded"
              value={safetyShoeToIssue}
              onChange={(e) => handleEquipmentInputChange('safetyShoe', e.target.value, 'safetyShoeRemarks', safetyShoeRemarks)}
            />
            <input 
              type="text" 
              placeholder="Enter remarks/id" 
              className="w-full p-2 border rounded"
              value={safetyShoeRemarks}
              onChange={(e) => handleRemarksChange('safetyShoeRemarks', e.target.value)}
            />
            {equipmentIssued.safetyShoe && (
              <div className="mt-1 text-sm text-green-600 flex items-center">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Equipment will be issued on save/next
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Vehicle Condition Check - Hidden by default but kept for compatibility */}
      <div className="hidden">
          <div className="space-y-3">
            <Label htmlFor="tiresCondition" className="text-sm font-medium">Tires Condition</Label>
            <Select
              value={formData.tiresCondition}
              onValueChange={(value) => updateFormData({ tiresCondition: value as 'good' | 'average' | 'poor' })}
            >
              <SelectTrigger id="tiresCondition">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="lightsWorking" 
                checked={formData.lightsWorking}
                onCheckedChange={(checked) => handleCheckboxChange('lightsWorking', checked as boolean)}
              />
              <Label htmlFor="lightsWorking">Lights Working Properly</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="brakesWorking" 
                checked={formData.brakesWorking}
                onCheckedChange={(checked) => handleCheckboxChange('brakesWorking', checked as boolean)}
              />
              <Label htmlFor="brakesWorking">Brakes in Good Condition</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="safetyEquipment" 
                checked={formData.safetyEquipment}
                onCheckedChange={(checked) => handleCheckboxChange('safetyEquipment', checked as boolean)}
              />
              <Label htmlFor="safetyEquipment">Safety Equipment Present</Label>
            </div>
      </div>
      
      {/* Notes and Observations */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Notes and Observations</h3>
        <Textarea
          id="vehicleRemarks"
          placeholder="Enter any remarks or notes regarding the vehicle condition..."
          value={formData.vehicleRemarks}
          onChange={(e) => handleVehicleRemarksChange(e.target.value)}
          rows={4}
        />
      </div>
      
      {/* Confirmation */}
      <div className="pt-2 border-t">
        {!allSafetyChecksPassed && !isPendingApproval && !isExceptionallyApproved && (
          <div className="mb-4">
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleSendForApproval}
            >
              <SendIcon className="h-4 w-4 mr-2" />
              Send for Approval
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              The following safety checks require exceptional approval:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-500 ml-4 mt-1">
              {safetyChecks
                .filter(check => check.status === "FAIL")
                .map((check, index) => (
                  <li key={index}>{check.name}</li>
                ))}
            </ul>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="vehicleConditionChecked" 
            checked={formData.vehicleConditionChecked}
            onCheckedChange={(checked) => handleCheckboxChange('vehicleConditionChecked', checked as boolean)}
          />
          <Label htmlFor="vehicleConditionChecked" className="font-semibold text-blue-700">
            I confirm that the vehicle has been thoroughly inspected and the condition is as reported
          </Label>
        </div>
        
        {!allSafetyChecksPassed && !isPendingApproval && !isExceptionallyApproved && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              All safety checks must pass or be exceptionally approved before you can proceed. You can send for approval if any safety checks have failed.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default VehicleCheckStep; 