import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProcessingFormData } from "../TruckProcessingModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, Upload, X, FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DocumentUploadStepProps {
  formData: ProcessingFormData;
  updateFormData: (data: Partial<ProcessingFormData>) => void;
  truck: any; // TruckCollaboration | null
}

const DocumentUploadStep = ({ formData, updateFormData, truck }: DocumentUploadStepProps) => {
  const [documentName, setDocumentName] = useState("");
  
  // In a real implementation, this would upload to Firebase Storage
  // For now, we'll just simulate the upload process
  const handleFileUpload = (fileType: 'driverLicense' | 'truckPermit' | 'insurance', file: File) => {
    // Simulate file upload by creating an object URL
    const fileUrl = URL.createObjectURL(file);
    
    updateFormData({
      [fileType + 'Image']: fileUrl
    });
  };
  
  // Add a new document
  const addAdditionalDocument = (file: File) => {
    if (!documentName.trim()) {
      return;
    }
    
    // Simulate file upload by creating an object URL
    const fileUrl = URL.createObjectURL(file);
    
    // Create a new document entry
    const newDoc = {
      id: Date.now().toString(),
      name: documentName,
      url: fileUrl
    };
    
    // Add to the list
    updateFormData({
      additionalDocs: [...formData.additionalDocs, newDoc]
    });
    
    // Reset document name
    setDocumentName("");
  };
  
  // Remove an additional document
  const removeAdditionalDocument = (id: string) => {
    updateFormData({
      additionalDocs: formData.additionalDocs.filter(doc => doc.id !== id)
    });
  };
  
  // Simulate file input change
  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    fileType: 'driverLicense' | 'truckPermit' | 'insurance' | 'additional'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (fileType === 'additional') {
      addAdditionalDocument(file);
    } else {
      handleFileUpload(fileType, file);
    }
    
    // Reset the input
    e.target.value = '';
  };
  
  // Remove an uploaded document
  const removeUploadedDocument = (fileType: 'driverLicense' | 'truckPermit' | 'insurance') => {
    updateFormData({
      [fileType + 'Image']: null
    });
  };
  
  // Helper to render a document uploader
  const renderDocumentUploader = (
    id: string, 
    label: string, 
    fileType: 'driverLicense' | 'truckPermit' | 'insurance',
    value: string | null
  ) => {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        
        {value ? (
          <div className="border rounded-md p-2 flex justify-between items-center bg-blue-50">
            <div className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              <span className="text-sm truncate max-w-[200px]">Document Uploaded</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeUploadedDocument(fileType)}
            >
              <X className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        ) : (
          <div className="border border-dashed rounded-md p-6 flex flex-col items-center justify-center">
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-2">Click to upload or drag and drop</p>
            <p className="text-xs text-gray-400">PDF, JPG, PNG (max. 5MB)</p>
            <input
              id={id}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileInputChange(e, fileType)}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => document.getElementById(id)?.click()}
            >
              Select File
            </Button>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Document Upload</AlertTitle>
        <AlertDescription>
          Upload scanned copies of the verified documents for digital record-keeping.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderDocumentUploader(
          "driver-license-upload",
          "Driver's License",
          "driverLicense",
          formData.driverLicenseImage
        )}
        
        {renderDocumentUploader(
          "truck-permit-upload",
          "Truck Permit",
          "truckPermit",
          formData.truckPermitImage
        )}
        
        {renderDocumentUploader(
          "insurance-upload",
          "Insurance Papers",
          "insurance",
          formData.insuranceImage
        )}
      </div>
      
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-medium text-gray-900">Additional Documents</h3>
        
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Document name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
            />
          </div>
          <input
            id="additional-doc-upload"
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileInputChange(e, 'additional')}
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('additional-doc-upload')?.click()}
            disabled={!documentName.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>
        
        {formData.additionalDocs.length > 0 && (
          <ScrollArea className="h-[200px] border rounded-md p-2">
            <div className="space-y-2">
              {formData.additionalDocs.map((doc) => (
                <div key={doc.id} className="flex justify-between items-center p-2 border rounded-md bg-gray-50">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-gray-500" />
                    <span className="text-sm">{doc.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAdditionalDocument(doc.id)}
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
      
      <div className="pt-4 border-t">
        <Alert className="bg-yellow-50 border-yellow-300">
          <InfoIcon className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Document uploads are optional but recommended. You can proceed to the next step even without uploading documents.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default DocumentUploadStep; 