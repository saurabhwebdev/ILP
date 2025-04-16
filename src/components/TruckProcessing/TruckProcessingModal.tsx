import { useState, useEffect } from "react";
                                                                                                                                                                                                                                                        import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import DocumentCheckStep from "./steps/DocumentCheckStep";
import VehicleCheckStep from "./steps/VehicleCheckStep";
import DocumentUploadStep from "./steps/DocumentUploadStep";
import SummaryStep from "./steps/SummaryStep";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { Truck, Save } from "lucide-react";

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
  processingDraft?: ProcessingFormData;
  plannedDestination?: string;
}

// Stepper types
export type StepStatus = "pending" | "in-progress" | "completed" | "error";

export interface ProcessingFormData {
  // Document Check
  documentsVerified: boolean;
  driverLicenseVerified: boolean;
  truckPermitVerified: boolean;
  insuranceVerified: boolean;
  documentRemarks: string;
  allDocumentsAreValid?: boolean;
  
  // Document Validity Dates
  driverLicenseValidUntil?: string;
  truckPermitValidUntil?: string;
  insuranceValidUntil?: string;
  pollutionCertValidUntil?: string;
  
  // Approval Status
  pendingApproval?: boolean;
  approvalReason?: string;
  exceptionallyApproved?: boolean;
  driverLicenseExceptionallyApproved?: boolean;
  truckPermitExceptionallyApproved?: boolean;
  insuranceExceptionallyApproved?: boolean;
  pollutionCertExceptionallyApproved?: boolean;
  
  // Safety Checks Approval
  safetyChecks?: Array<{
    name: string;
    description: string;
    response: "Yes" | "No";
    status: "PASS" | "FAIL";
  }>;
  allSafetyChecksPassed?: boolean;
  safetyChecksPendingApproval?: boolean;
  safetyCheckApprovalReason?: string;
  safetyChecksExceptionallyApproved?: boolean;
  
  // Vehicle Condition
  vehicleConditionChecked: boolean;
  tiresCondition: "good" | "average" | "poor";
  lightsWorking: boolean;
  brakesWorking: boolean;
  safetyEquipment: boolean;
  vehicleRemarks: string;
  riskLevel: "low" | "medium" | "high";
  
  // Safety Equipment
  issuedWheelChoke?: {
    quantity: string;
    remarks: string;
  } | null;
  issuedSafetyShoe?: {
    quantity: string;
    remarks: string;
  } | null;
  
  // Document Upload
  driverLicenseImage: string | null;
  truckPermitImage: string | null;
  insuranceImage: string | null;
  additionalDocs: Array<{id: string, name: string, url: string}>;
  
  // Summary
  processingCompleted: boolean;
  finalRemarks: string;
  nextMilestone?: "WeighBridge" | "InternalParking" | null;
}

interface TruckProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  truck: TruckCollaboration | null;
  onProcessingComplete: () => void;
}

const TruckProcessingModal = ({ isOpen, onClose, truck, onProcessingComplete }: TruckProcessingModalProps) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  // Determine initial nextMilestone based on truck.plannedDestination if available
  const getInitialNextMilestone = () => {
    console.log("TruckProcessingModal - Initializing with truck:", truck);
    if (truck?.plannedDestination === "Internal Parking") {
      console.log("TruckProcessingModal - Initial nextMilestone set to InternalParking");
      return "InternalParking";
    }
    // Default is null, will be set later if needed
    return null;
  };
  
  // Current step state
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ["Document Check", "Vehicle & Risk Check", "Upload Documents", "Summary"];
  
  // Form data for all steps
  const [formData, setFormData] = useState<ProcessingFormData>({
    // Document Check
    documentsVerified: false,
    driverLicenseVerified: false,
    truckPermitVerified: false,
    insuranceVerified: false,
    documentRemarks: "",
    allDocumentsAreValid: false,
    
    // Document Validity Dates
    driverLicenseValidUntil: "",
    truckPermitValidUntil: "",
    insuranceValidUntil: "",
    pollutionCertValidUntil: "",
    
    // Approval Status
    pendingApproval: false,
    approvalReason: "",
    exceptionallyApproved: false,
    driverLicenseExceptionallyApproved: false,
    truckPermitExceptionallyApproved: false,
    insuranceExceptionallyApproved: false,
    pollutionCertExceptionallyApproved: false,
    
    // Safety Checks Approval
    allSafetyChecksPassed: false,
    safetyChecksPendingApproval: false,
    safetyCheckApprovalReason: "",
    safetyChecksExceptionallyApproved: false,
    
    // Vehicle Condition
    vehicleConditionChecked: false,
    tiresCondition: "good",
    lightsWorking: true,
    brakesWorking: true,
    safetyEquipment: true,
    vehicleRemarks: "",
    riskLevel: "low",
    
    // Safety Equipment
    issuedWheelChoke: null,
    issuedSafetyShoe: null,
    
    // Document Upload
    driverLicenseImage: null,
    truckPermitImage: null,
    insuranceImage: null,
    additionalDocs: [],
    
    // Summary
    processingCompleted: false,
    finalRemarks: "",
    nextMilestone: getInitialNextMilestone(),
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Load any existing draft data when the modal opens
  useEffect(() => {
    if (isOpen && truck?.id) {
      console.log("TruckProcessingModal - Modal opened for truck:", truck.id);
      console.log("TruckProcessingModal - Truck data:", truck);
      console.log("TruckProcessingModal - Truck plannedDestination:", truck.plannedDestination);
      loadDraftData();
    }
  }, [isOpen, truck?.id]);
  
  // Add useEffect to sync safety checks to Firestore when they change
  useEffect(() => {
    // Only update if there are actual changes to the safety checks and vehicle remarks
    if (truck?.id && formData.safetyChecks && formData.safetyChecks.length > 0) {
      const syncSafetyChecks = async () => {
        try {
          const truckRef = doc(db, "transporterCollaborations", truck.id);
          // Update only the necessary fields related to safety checks
          await updateDoc(truckRef, {
            "processingDraft.safetyChecks": formData.safetyChecks,
            "processingDraft.allSafetyChecksPassed": formData.allSafetyChecksPassed,
            "processingDraft.vehicleRemarks": formData.vehicleRemarks,
            "processingDraft.issuedWheelChoke": formData.issuedWheelChoke,
            "processingDraft.issuedSafetyShoe": formData.issuedSafetyShoe,
            lastUpdatedAt: serverTimestamp(),
            lastUpdatedBy: currentUser?.uid
          });
        } catch (error) {
          console.error("Error syncing safety checks:", error);
        }
      };
      
      syncSafetyChecks();
    }
  }, [formData.safetyChecks, formData.vehicleRemarks, formData.issuedWheelChoke, formData.issuedSafetyShoe, truck?.id, currentUser?.uid]);
  
  // Load draft data from Firebase
  const loadDraftData = async () => {
    if (!truck?.id || !currentUser) return;
    
    try {
      setIsLoading(true);
      console.log("TruckProcessingModal - Loading draft data for truck:", truck);
      console.log("TruckProcessingModal - Truck plannedDestination:", truck.plannedDestination);
      
      const truckRef = doc(db, "transporterCollaborations", truck.id);
      const truckDoc = await getDoc(truckRef);
      
      if (truckDoc.exists()) {
        const truckData = truckDoc.data() as TruckCollaboration;
        console.log("TruckProcessingModal - Firestore data:", truckData);
        
        if (truckData.processingDraft) {
          // Restore the draft data
          console.log("TruckProcessingModal - Found processing draft:", truckData.processingDraft);
          setFormData(truckData.processingDraft);
          toast({
            title: "Draft Loaded",
            description: "Your previous work has been restored.",
          });
        } else {
          // If no draft but the truck has plannedDestination, set it in the formData
          if (truckData.plannedDestination && !formData.nextMilestone) {
            console.log("TruckProcessingModal - Initializing nextMilestone from plannedDestination:", truckData.plannedDestination);
            
            if (truckData.plannedDestination === "Internal Parking") {
              updateFormData({ nextMilestone: "InternalParking" });
            } else {
              updateFormData({ nextMilestone: "WeighBridge" });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading draft data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save draft data to Firebase
  const saveDraftData = async () => {
    if (!truck?.id || !currentUser) return;
    
    try {
      setIsSaving(true);
      const truckRef = doc(db, "transporterCollaborations", truck.id);
      await updateDoc(truckRef, {
        processingDraft: formData,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      });
      
      toast({
        title: "Progress Saved",
        description: "Your work has been saved as a draft.",
      });
    } catch (error) {
      console.error("Error saving draft data:", error);
      toast({
        title: "Error",
        description: "Failed to save your progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Update form data
  const updateFormData = (data: Partial<ProcessingFormData>) => {
    console.log("TruckProcessingModal - Updating form data:", data);
    
    // Handle the special case of setting nextMilestone
    if (data.nextMilestone !== undefined) {
      console.log("TruckProcessingModal - Updating nextMilestone to:", data.nextMilestone);
    }
    
    setFormData(prev => ({ ...prev, ...data }));
  };
  
  // Go to next step
  const goToNextStep = async () => {
    if (currentStep < steps.length - 1) {
      // Save the current step data before moving to the next
      await saveDraftData();
      console.log(`TruckProcessingModal - Moving from step ${currentStep} to step ${currentStep + 1}`);
      console.log("TruckProcessingModal - Current formData:", formData);
      setCurrentStep(prev => prev + 1);
    }
  };
  
  // Go to previous step
  const goToPreviousStep = async () => {
    if (currentStep > 0) {
      // Save the current step data before moving to the previous
      await saveDraftData();
      setCurrentStep(prev => prev - 1);
    }
  };
  
  // Handle close - save form data and close modal
  const handleClose = async () => {
    // Save the current state before closing
    if (truck?.id) {
      await saveDraftData();
    }
    
    setCurrentStep(0);
    onClose();
  };
  
  // Complete processing
  const completeProcessing = async () => {
    if (!truck?.id || !currentUser) return;
    
    // Make sure all steps are completed
    if (!formData.documentsVerified || !formData.vehicleConditionChecked) {
      toast({
        title: "Incomplete steps",
        description: "Please complete all required steps before finalizing.",
        variant: "destructive",
      });
      return;
    }
    
    // Make sure next milestone is selected
    if (!formData.nextMilestone) {
      toast({
        title: "Next milestone not selected",
        description: "Please select the next destination for the truck.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Update the truck status to "Inside" when processing is complete
      const truckRef = doc(db, "transporterCollaborations", truck.id);
      
      // Prepare the processing data to be stored
      const processingData = {
        ...formData,
        processedAt: serverTimestamp(),
        processedBy: currentUser.uid,
        nextMilestone: formData.nextMilestone,
      };
      
      // Extract safety equipment data to store at root level
      const updateData: any = {
        status: "Inside",
        processingData,
        processingDraft: null, // Clear the draft once processing is complete
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid,
        nextMilestone: formData.nextMilestone, // Store this at the root level for easy querying
      };
      
      // Also store safety equipment data at the root level for easy access
      if (formData.issuedWheelChoke) {
        updateData.issuedWheelChoke = {
          ...formData.issuedWheelChoke,
          issuedBy: currentUser.uid,
          issuedAt: serverTimestamp()
        };
      }
      
      if (formData.issuedSafetyShoe) {
        updateData.issuedSafetyShoe = {
          ...formData.issuedSafetyShoe,
          issuedBy: currentUser.uid,
          issuedAt: serverTimestamp()
        };
      }
      
      // Update the document with processing data and change status to "Inside"
      await updateDoc(truckRef, updateData);
      
      toast({
        title: "Processing complete",
        description: "The truck has been successfully processed and moved to Inside status.",
      });
      
      // Call the completion callback to refresh parent component
      onProcessingComplete();
      
      // Close the modal
      onClose();
      
    } catch (error) {
      console.error("Error completing truck processing:", error);
      toast({
        title: "Processing failed",
        description: "An error occurred while finalizing the truck processing.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render current step content
  const renderStepContent = () => {
    if (isLoading) {
      return <div className="flex justify-center py-8">Loading...</div>;
    }
    
    // Check if we need to pre-initialize nextMilestone for the Summary step
    if (currentStep === 3 && !formData.nextMilestone && truck?.plannedDestination) {
      // Initialize nextMilestone based on plannedDestination if not already set
      let initialNextMilestone: "WeighBridge" | "InternalParking" = "WeighBridge";
      
      if (truck.plannedDestination === "Internal Parking") {
        initialNextMilestone = "InternalParking";
      }
      
      console.log("TruckProcessingModal - Pre-initializing nextMilestone for Summary step:", initialNextMilestone);
      
      // Create a copy of formData with the initialized nextMilestone
      const updatedFormData = {
        ...formData,
        nextMilestone: initialNextMilestone
      };
      
      // Use the updated form data for the Summary step
      return (
        <SummaryStep 
          formData={updatedFormData} 
          updateFormData={updateFormData}
          truck={truck}
        />
      );
    }
    
    switch (currentStep) {
      case 0:
        return (
          <DocumentCheckStep 
            formData={formData} 
            updateFormData={updateFormData}
            truck={truck}
          />
        );
      case 1:
        return (
          <VehicleCheckStep 
            formData={formData} 
            updateFormData={updateFormData}
            truck={truck}
          />
        );
      case 2:
        return (
          <DocumentUploadStep 
            formData={formData} 
            updateFormData={updateFormData}
            truck={truck}
          />
        );
      case 3:
        return (
          <SummaryStep 
            formData={formData} 
            updateFormData={updateFormData}
            truck={truck}
          />
        );
      default:
        return null;
    }
  };
  
  // Check if current step is valid before proceeding
  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Document check step
        return formData.documentsVerified;
      
      case 1: // Vehicle check step
        return formData.vehicleConditionChecked;
      
      case 2: // Document upload step
        // Allow proceeding to next step even if uploads are not complete
        return true;
      
      case 3: // Summary step
        // Require checkbox confirmation and next milestone selection before allowing completion
        return formData.processingCompleted && formData.nextMilestone !== null && formData.nextMilestone !== undefined;
      
      default:
        return false;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Truck Processing - {steps[currentStep]}
          </DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {steps.length}: {truck?.vehicleNumber ? `Processing truck ${truck.vehicleNumber}` : 'Processing truck'}
          </DialogDescription>
        </DialogHeader>
        
        {/* Stepper */}
        <div className="w-full py-4">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index < currentStep ? "bg-green-500 text-white" : 
                  index === currentStep ? "bg-blue-600 text-white" : 
                  "bg-gray-200 text-gray-500"
                }`}>
                  {index + 1}
                </div>
                <span className={`text-xs mt-1 ${
                  index === currentStep ? "text-blue-600 font-medium" : "text-gray-500"
                }`}>
                  {step}
                </span>
              </div>
            ))}
            
            {/* Connecting lines */}
            <div className="absolute left-0 right-0 top-[1.75rem] mx-auto">
              <div className="h-0.5 bg-gray-200">
                <div className="h-0.5 bg-blue-600" style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Current step content */}
        <div className="py-4">
          {renderStepContent()}
        </div>
        
        {/* Navigation */}
        <DialogFooter className="flex flex-row justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            
            <Button 
              variant="secondary"
              onClick={saveDraftData}
              disabled={isSaving || isLoading}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Progress"}
            </Button>
          </div>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={isLoading || isSaving}
              >
                Back
              </Button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  console.log("Document validation state:", {
                    driverLicenseVerified: formData.driverLicenseVerified,
                    truckPermitVerified: formData.truckPermitVerified,
                    insuranceVerified: formData.insuranceVerified,
                    allDocumentsAreValid: formData.allDocumentsAreValid,
                    exceptionallyApproved: formData.exceptionallyApproved,
                    isStepValid: isStepValid(),
                    currentStep
                  });
                  goToNextStep();
                }}
                disabled={
                  currentStep === 0 
                    ? (!formData.exceptionallyApproved && 
                        !(formData.driverLicenseVerified && 
                          formData.truckPermitVerified && 
                          formData.insuranceVerified)) || 
                      isLoading || 
                      isSaving
                    : currentStep === 1
                    ? (!formData.vehicleConditionChecked || 
                        !(formData.allSafetyChecksPassed || formData.safetyChecksExceptionallyApproved)) ||
                      isLoading || 
                      isSaving
                    : !isStepValid() || isLoading || isSaving
                }
              >
                Next
              </Button>
            ) : (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={completeProcessing}
                disabled={isLoading || isSaving}
              >
                {isLoading ? "Completing..." : "Complete Processing"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TruckProcessingModal; 