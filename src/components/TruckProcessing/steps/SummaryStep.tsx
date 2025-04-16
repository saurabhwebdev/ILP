import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProcessingFormData } from "../TruckProcessingModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, FileText, InfoIcon, ShieldCheck, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SummaryStepProps {
  formData: ProcessingFormData;
  updateFormData: (data: Partial<ProcessingFormData>) => void;
  truck: any; // TruckCollaboration | null
}

const SummaryStep = ({ formData, updateFormData, truck }: SummaryStepProps) => {
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

  const handleCheckboxChange = (field: keyof ProcessingFormData, checked: boolean) => {
    updateFormData({ [field]: checked });
  };
  
  // Check for high risk or poor tire condition
  const hasHighRisk = formData.riskLevel === "high";
  const hasPoorTires = formData.tiresCondition === "poor";
  
  // Check if safety checks are valid
  const safetyChecksValid = formData.allSafetyChecksPassed || formData.safetyChecksExceptionallyApproved;
  
  // Check if all mandatory steps are completed
  const documentsVerified = formData.documentsVerified;
  const vehicleChecked = formData.vehicleConditionChecked;
  
  // Check if safety equipment was issued
  const hasIssuedWheelChoke = formData.issuedWheelChoke && parseInt(formData.issuedWheelChoke.quantity) > 0;
  const hasIssuedSafetyShoe = formData.issuedSafetyShoe && parseInt(formData.issuedSafetyShoe.quantity) > 0;
  const hasIssuedEquipment = hasIssuedWheelChoke || hasIssuedSafetyShoe;
  
  const handleNextMilestoneChange = (value: string) => {
    updateFormData({ nextMilestone: value as "WeighBridge" | "InternalParking" });
  };
  
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Processing Summary</AlertTitle>
        <AlertDescription>
          Review the processing details before finalizing. All required steps must be completed.
        </AlertDescription>
      </Alert>
      
      {/* Truck Details */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Truck Details</h3>
          <div className="flex items-center">
            <span className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-blue-400">
              {truck?.status || 'Waiting'}
            </span>
            <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded border border-gray-400">
              {truck?.vehicleNumber || 'Unknown'}
            </span>
          </div>
        </div>
        
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
          <div>
            <span className="text-sm font-medium text-gray-500">Created At:</span>
            <p className="text-sm text-gray-900">{formatDate(truck?.createdAt)}</p>
          </div>
          {truck?.isTransshipment && (
            <div>
              <span className="text-sm font-medium text-gray-500">Type:</span>
              <p className="text-sm text-blue-600 font-medium">Transshipment</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Document Check Summary */}
      <div>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-medium text-gray-900">1. Document Verification</h3>
          {documentsVerified ? (
            <span className="flex items-center text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Completed
            </span>
          ) : (
            <span className="flex items-center text-red-600 text-sm">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Incomplete
            </span>
          )}
        </div>
        
        <div className="bg-gray-50 p-3 rounded-md mb-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${formData.driverLicenseVerified ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">Driver's License</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${formData.truckPermitVerified ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">Truck Permit</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${formData.insuranceVerified ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">Insurance</span>
            </div>
          </div>
        </div>
        
        {formData.documentRemarks && (
          <div className="text-sm text-gray-600 italic">
            <span className="font-medium">Remarks:</span> {formData.documentRemarks}
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Vehicle Check Summary */}
      <div>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-medium text-gray-900">2. Vehicle & Safety Checks</h3>
          {vehicleChecked ? (
            <span className="flex items-center text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Completed
            </span>
          ) : (
            <span className="flex items-center text-red-600 text-sm">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Incomplete
            </span>
          )}
        </div>
        
        {/* Safety Checks Summary */}
        <div className="bg-gray-50 p-3 rounded-md mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Safety Checks</h4>
          {formData.safetyChecks && formData.safetyChecks.length > 0 ? (
            <div className="space-y-2">
              {formData.safetyChecks.map((check, index) => (
                <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${check.status === 'PASS' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm">{check.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    check.status === 'PASS' ? 'bg-green-100 text-green-800' : 
                    formData.safetyChecksExceptionallyApproved ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {check.status === 'PASS' ? 'PASS' : 
                     formData.safetyChecksExceptionallyApproved ? 'APPROVED' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">No safety checks recorded</div>
          )}
          
          {formData.safetyChecksExceptionallyApproved && (
            <div className="mt-2 text-sm text-blue-600 bg-blue-50 p-2 rounded flex items-center">
              <InfoIcon className="h-4 w-4 mr-1" />
              Safety checks have been exceptionally approved
            </div>
          )}
        </div>
        
        {/* Safety Equipment Issued */}
        {hasIssuedEquipment && (
          <div className="bg-gray-50 p-3 rounded-md mt-3">
            <div className="flex items-center mb-2">
              <ShieldCheck className="h-4 w-4 text-blue-600 mr-2" />
              <h4 className="text-sm font-medium text-gray-700">Safety Equipment Issued</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hasIssuedWheelChoke && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Wheel Chokes</span>
                  <div className="flex items-center text-sm">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>{formData.issuedWheelChoke?.quantity} issued</span>
                    {formData.issuedWheelChoke?.remarks && (
                      <span className="ml-2 text-gray-500">({formData.issuedWheelChoke.remarks})</span>
                    )}
                  </div>
                </div>
              )}
              
              {hasIssuedSafetyShoe && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Safety Shoes</span>
                  <div className="flex items-center text-sm">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>{formData.issuedSafetyShoe?.quantity} issued</span>
                    {formData.issuedSafetyShoe?.remarks && (
                      <span className="ml-2 text-gray-500">({formData.issuedSafetyShoe.remarks})</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {formData.vehicleRemarks && (
          <div className="text-sm text-gray-600 italic mt-2">
            <span className="font-medium">Remarks:</span> {formData.vehicleRemarks}
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Document Upload Summary */}
      <div>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-medium text-gray-900">3. Document Uploads</h3>
          <span className="flex items-center text-blue-600 text-sm">
            <FileText className="h-4 w-4 mr-1" />
            {formData.driverLicenseImage || formData.truckPermitImage || formData.insuranceImage || formData.additionalDocs.length > 0 
              ? `${[
                  formData.driverLicenseImage ? 1 : 0,
                  formData.truckPermitImage ? 1 : 0,
                  formData.insuranceImage ? 1 : 0
                ].reduce((a, b) => a + b, 0) + formData.additionalDocs.length} Documents`
              : "Optional"
            }
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${formData.driverLicenseImage ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm">Driver's License</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${formData.truckPermitImage ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm">Truck Permit</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${formData.insuranceImage ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm">Insurance</span>
          </div>
        </div>
        
        {formData.additionalDocs.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-md mt-2">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Documents ({formData.additionalDocs.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {formData.additionalDocs.map(doc => (
                <div key={doc.id} className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm truncate">{doc.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Warning Alerts */}
      {(!documentsVerified || !vehicleChecked || !safetyChecksValid) &&
        <div className="space-y-3">
          {!safetyChecksValid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed Safety Checks</AlertTitle>
              <AlertDescription>
                Some safety checks have failed and have not been approved. This truck cannot proceed without all safety checks passing or being approved.
              </AlertDescription>
            </Alert>
          )}
          
          {!documentsVerified && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Documents Not Verified</AlertTitle>
              <AlertDescription>
                Document verification is mandatory. Please go back and complete this step.
              </AlertDescription>
            </Alert>
          )}
          
          {!vehicleChecked && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Vehicle Not Checked</AlertTitle>
              <AlertDescription>
                Vehicle inspection is mandatory. Please go back and complete this step.
              </AlertDescription>
            </Alert>
          )}
        </div>
      }
      
      {/* Final Remarks */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Final Remarks</h3>
        <Textarea
          id="finalRemarks"
          placeholder="Add any final remarks or special instructions for this truck..."
          value={formData.finalRemarks}
          onChange={(e) => updateFormData({ finalRemarks: e.target.value })}
          rows={4}
        />
      </div>
      
      {/* Confirmation */}
      <div className="pt-2 border-t">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="processingCompleted" 
            checked={formData.processingCompleted}
            onCheckedChange={(checked) => handleCheckboxChange('processingCompleted', checked as boolean)}
            disabled={!documentsVerified || !vehicleChecked || !safetyChecksValid}
          />
          <Label htmlFor="processingCompleted" className="font-semibold text-blue-700">
            I confirm that all checks have been completed and the truck is ready to proceed
          </Label>
        </div>
        
        {(!documentsVerified || !vehicleChecked || !safetyChecksValid) && (
          <p className="text-sm text-red-600 mt-2">
            You cannot complete the processing until all mandatory steps are completed and safety checks have passed or been approved.
          </p>
        )}
      </div>
      
      {/* Next Milestone Selection */}
      <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center mb-3">
          <ArrowRight className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Next Milestone</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="nextMilestone" className="text-sm font-medium text-gray-700 mb-1 block">
              Select the next destination for this truck after processing
            </Label>
            <Select
              value={formData.nextMilestone || ""}
              onValueChange={handleNextMilestoneChange}
            >
              <SelectTrigger className="w-full" id="nextMilestone">
                <SelectValue placeholder="Select next destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WeighBridge">Weigh Bridge</SelectItem>
                <SelectItem value="InternalParking">Internal Parking</SelectItem>
              </SelectContent>
            </Select>
            
            {!formData.nextMilestone && (
              <p className="text-sm text-amber-600 mt-1">
                Please select a next destination for the truck
              </p>
            )}
          </div>
          
          {formData.nextMilestone === "WeighBridge" && (
            <Alert className="bg-blue-50 border-blue-200">
              <InfoIcon className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Weigh Bridge Selected</AlertTitle>
              <AlertDescription className="text-blue-700">
                After processing, this truck will be sent to the Weigh Bridge for weight measurement.
                Only trucks directed to Weigh Bridge can be processed there.
              </AlertDescription>
            </Alert>
          )}
          
          {formData.nextMilestone === "InternalParking" && (
            <Alert className="bg-green-50 border-green-200">
              <InfoIcon className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Internal Parking Selected</AlertTitle>
              <AlertDescription className="text-green-700">
                After processing, this truck will be directed to the Internal Parking area.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryStep;