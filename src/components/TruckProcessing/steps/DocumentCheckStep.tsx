import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProcessingFormData } from "../TruckProcessingModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, CheckCircle2, XCircle, SendIcon, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface DocumentCheckStepProps {
  formData: ProcessingFormData;
  updateFormData: (data: Partial<ProcessingFormData>) => void;
  truck: any; // TruckCollaboration | null
}

interface DocumentValidation {
  type: string;
  validUntil: string;
  isValid: boolean;
  exceptionallyApproved?: boolean;
}

// Update ProcessingFormData interface to include document validity dates
// This is just for type reference, the actual interface is defined in TruckProcessingModal.tsx
interface ExtendedProcessingFormData extends ProcessingFormData {
  driverLicenseValidUntil?: string;
  truckPermitValidUntil?: string;
  insuranceValidUntil?: string;
  pollutionCertValidUntil?: string;
  pendingApproval?: boolean;
  approvalReason?: string;
  exceptionallyApproved?: boolean;
  driverLicenseExceptionallyApproved?: boolean;
  truckPermitExceptionallyApproved?: boolean;
  insuranceExceptionallyApproved?: boolean;
  pollutionCertExceptionallyApproved?: boolean;
}

const DocumentCheckStep = ({ formData, updateFormData, truck }: DocumentCheckStepProps) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  // Initialize document validations from formData if they exist
  const [documentValidations, setDocumentValidations] = useState<DocumentValidation[]>([
    { 
      type: "Driver License", 
      validUntil: (formData as ExtendedProcessingFormData).driverLicenseValidUntil || "", 
      isValid: formData.driverLicenseVerified,
      exceptionallyApproved: (formData as ExtendedProcessingFormData).driverLicenseExceptionallyApproved 
    },
    { 
      type: "Registration Certificate", 
      validUntil: (formData as ExtendedProcessingFormData).truckPermitValidUntil || "", 
      isValid: formData.truckPermitVerified,
      exceptionallyApproved: (formData as ExtendedProcessingFormData).truckPermitExceptionallyApproved
    },
    { 
      type: "Insurance", 
      validUntil: (formData as ExtendedProcessingFormData).insuranceValidUntil || "", 
      isValid: formData.insuranceVerified,
      exceptionallyApproved: (formData as ExtendedProcessingFormData).insuranceExceptionallyApproved
    },
    { 
      type: "Pollution Certificate", 
      validUntil: (formData as ExtendedProcessingFormData).pollutionCertValidUntil || "", 
      isValid: false,
      exceptionallyApproved: (formData as ExtendedProcessingFormData).pollutionCertExceptionallyApproved
    }
  ]);

  // Initialize from formData on component mount
  useEffect(() => {
    const extendedFormData = formData as ExtendedProcessingFormData;
    if (extendedFormData.driverLicenseValidUntil || 
        extendedFormData.truckPermitValidUntil || 
        extendedFormData.insuranceValidUntil || 
        extendedFormData.pollutionCertValidUntil) {
      setDocumentValidations([
        { 
          type: "Driver License", 
          validUntil: extendedFormData.driverLicenseValidUntil || "", 
          isValid: formData.driverLicenseVerified,
          exceptionallyApproved: extendedFormData.driverLicenseExceptionallyApproved
        },
        { 
          type: "Registration Certificate", 
          validUntil: extendedFormData.truckPermitValidUntil || "", 
          isValid: formData.truckPermitVerified,
          exceptionallyApproved: extendedFormData.truckPermitExceptionallyApproved
        },
        { 
          type: "Insurance", 
          validUntil: extendedFormData.insuranceValidUntil || "", 
          isValid: formData.insuranceVerified,
          exceptionallyApproved: extendedFormData.insuranceExceptionallyApproved
        },
        { 
          type: "Pollution Certificate", 
          validUntil: extendedFormData.pollutionCertValidUntil || "", 
          isValid: isDateValid(extendedFormData.pollutionCertValidUntil || ""),
          exceptionallyApproved: extendedFormData.pollutionCertExceptionallyApproved
        }
      ]);
    }
  }, []);

  const handleCheckboxChange = (field: keyof ProcessingFormData, checked: boolean) => {
    updateFormData({ [field]: checked });
  };

  // Check if a date is in the future
  const isDateValid = (dateString: string): boolean => {
    if (!dateString) return false;
    const currentDate = new Date();
    const validityDate = new Date(dateString);
    return validityDate > currentDate;
  };

  // Calculate if all required documents are valid
  const calculateAllDocumentsValid = () => {
    return (
      documentValidations[0].isValid && 
      documentValidations[1].isValid && 
      documentValidations[2].isValid
    );
  };
  
  // Check if any document needs approval - should be shown when any doc is invalid
  const needsApproval = documentValidations.some(doc => !doc.isValid && !doc.exceptionallyApproved);
  
  // Calculate if all documents are actually valid (not just exceptionally approved)
  const allDocsAreValid = calculateAllDocumentsValid();
  
  // Ensure formData reflects current validation state
  useEffect(() => {
    if (formData.allDocumentsAreValid !== allDocsAreValid) {
      updateFormData({ allDocumentsAreValid: allDocsAreValid });
    }
  }, [allDocsAreValid]);

  // Handle document validation date change
  const handleValidityDateChange = (index: number, date: string) => {
    const updatedValidations = [...documentValidations];
    updatedValidations[index].validUntil = date;
    updatedValidations[index].isValid = isDateValid(date);
    setDocumentValidations(updatedValidations);

    // Create an object to update formData
    const formDataUpdate: Partial<ExtendedProcessingFormData> = {};

    // Update the relevant formData fields based on index
    if (index === 0) { // Driver License
      formDataUpdate.driverLicenseVerified = isDateValid(date);
      formDataUpdate.driverLicenseValidUntil = date;
    } else if (index === 1) { // Registration Certificate
      formDataUpdate.truckPermitVerified = isDateValid(date);
      formDataUpdate.truckPermitValidUntil = date;
    } else if (index === 2) { // Insurance
      formDataUpdate.insuranceVerified = isDateValid(date);
      formDataUpdate.insuranceValidUntil = date;
    } else if (index === 3) { // Pollution Certificate
      formDataUpdate.pollutionCertValidUntil = date;
    }

    // Check if all docs are valid (not just exceptionally approved)
    const allDocsValid = 
      updatedValidations[0].isValid && 
      updatedValidations[1].isValid && 
      updatedValidations[2].isValid;
    
    // Check if all docs are either valid or exceptionally approved
    const allDocsValidOrApproved = 
      (updatedValidations[0].isValid || updatedValidations[0].exceptionallyApproved) && 
      (updatedValidations[1].isValid || updatedValidations[1].exceptionallyApproved) && 
      (updatedValidations[2].isValid || updatedValidations[2].exceptionallyApproved);

    // Update the overall documentsVerified status - only true if all docs are actually valid
    // or if they've been exceptionally approved
    formDataUpdate.documentsVerified = allDocsValidOrApproved;
    
    // Also set a separate flag to track if all docs are naturally valid
    formDataUpdate.allDocumentsAreValid = allDocsValid;

    // Update the form data
    updateFormData(formDataUpdate);
  };

  // Send for approval
  const handleSendForApproval = async () => {
    if (!currentUser || !truck) return;
    
    try {
      // Update truck processing data
      updateFormData({ 
        pendingApproval: true,
        approvalReason: formData.documentRemarks 
      });
      
      // Create approval request
      await addDoc(collection(db, "approvalRequests"), {
        truckId: truck.id,
        vehicleNumber: truck.vehicleNumber,
        driverName: truck.driverName,
        requestedBy: currentUser.uid,
        requestedAt: serverTimestamp(),
        reason: formData.documentRemarks,
        status: "pending"
      });
      
      toast({
        title: "Approval Requested",
        description: "The truck has been sent for exceptional approval."
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

  // Check if already pending approval
  const isPendingApproval = (formData as ExtendedProcessingFormData).pendingApproval;
  
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Document Verification</AlertTitle>
        <AlertDescription>
          Verify all the required documents and their validity dates before proceeding.
        </AlertDescription>
      </Alert>
      
      {/* Approval Status Alert */}
      {isPendingApproval && (
        <Alert className="bg-amber-50 text-amber-800 border-amber-300">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Pending Approval</AlertTitle>
          <AlertDescription>
            This truck's documentation is pending exceptional approval from a manager.
          </AlertDescription>
        </Alert>
      )}
      
      {(formData as ExtendedProcessingFormData).exceptionallyApproved && (
        <Alert className="bg-blue-50 text-blue-800 border-blue-300">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Exceptionally Approved</AlertTitle>
          <AlertDescription>
            This truck's documentation has been exceptionally approved.
          </AlertDescription>
        </Alert>
      )}
      
      {!(formData as ExtendedProcessingFormData).allDocumentsAreValid && 
       !(formData as ExtendedProcessingFormData).exceptionallyApproved && 
       !isPendingApproval && (
        <Alert className="bg-red-50 text-red-800 border-red-300">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Invalid Documents</AlertTitle>
          <AlertDescription>
            Some documents have expired or are invalid. You cannot proceed to the next step until all documents are valid or exceptionally approved.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Truck Details */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Truck Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Vehicle Number</p>
            <p className="text-base font-medium">{truck?.vehicleNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Driver Name</p>
            <p className="text-base font-medium">{truck?.driverName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Driver Mobile</p>
            <p className="text-base font-medium">{truck?.driverMobile || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Transporter</p>
            <p className="text-base font-medium">{truck?.transporter || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Material Type</p>
            <p className="text-base font-medium">{truck?.materialType || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Arrival Time</p>
            <p className="text-base font-medium">
              {truck?.arrivalDateTime ? format(new Date(truck.arrivalDateTime), "PPpp") : 'N/A'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Document Validation */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Document Validation</h3>
        
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validity Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documentValidations.map((doc, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {doc.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Input
                        type="date"
                        value={doc.validUntil}
                        onChange={(e) => handleValidityDateChange(index, e.target.value)}
                        className="w-full"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doc.exceptionallyApproved ? (
                        <div className="flex items-center text-blue-600">
                          <ShieldAlert className="h-5 w-5 mr-1" />
                          <span>Exceptionally Approved</span>
                        </div>
                      ) : doc.validUntil ? (
                        doc.isValid ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle2 className="h-5 w-5 mr-1" />
                            <span>Pass</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <XCircle className="h-5 w-5 mr-1" />
                            <span>Fail - Expired</span>
                          </div>
                        )
                      ) : (
                        <span className="text-gray-400">Not Checked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md mt-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                formData.driverLicenseVerified || (formData as ExtendedProcessingFormData).driverLicenseExceptionallyApproved ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm">Driver's License</span>
              {(formData as ExtendedProcessingFormData).driverLicenseExceptionallyApproved && 
                <span className="ml-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">Exceptionally Approved</span>
              }
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <div className={`w-3 h-3 rounded-full ${
                formData.truckPermitVerified || (formData as ExtendedProcessingFormData).truckPermitExceptionallyApproved ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm">Registration Certificate</span>
              {(formData as ExtendedProcessingFormData).truckPermitExceptionallyApproved && 
                <span className="ml-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">Exceptionally Approved</span>
              }
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <div className={`w-3 h-3 rounded-full ${
                formData.insuranceVerified || (formData as ExtendedProcessingFormData).insuranceExceptionallyApproved ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm">Insurance</span>
              {(formData as ExtendedProcessingFormData).insuranceExceptionallyApproved && 
                <span className="ml-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">Exceptionally Approved</span>
              }
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Remarks</h3>
        <Textarea
          id="documentRemarks"
          placeholder="Enter any remarks or notes regarding the document verification..."
          value={formData.documentRemarks}
          onChange={(e) => updateFormData({ documentRemarks: e.target.value })}
          rows={4}
        />
      </div>
      
      <div className="pt-2 border-t">
        {needsApproval && !isPendingApproval && (
          <div className="mb-4">
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleSendForApproval}
            >
              <SendIcon className="h-4 w-4 mr-2" />
              Send for Approval
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              The following documents require exceptional approval:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-500 ml-4 mt-1">
              {documentValidations.map((doc, index) => (
                !doc.isValid && !doc.exceptionallyApproved ? (
                  <li key={index}>{doc.type}</li>
                ) : null
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="documentsVerified" 
            checked={formData.documentsVerified}
            onCheckedChange={(checked) => handleCheckboxChange('documentsVerified', checked as boolean)}
          />
          <Label htmlFor="documentsVerified" className="font-semibold text-blue-700">
            I confirm that all documents have been verified and are in order
          </Label>
        </div>
        
        {!formData.documentsVerified && !isPendingApproval && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              All required documents must have valid dates or be exceptionally approved before you can proceed. You can send for approval if any documents have expired.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default DocumentCheckStep; 