import { useState } from "react";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { 
  collection, 
  doc,
  updateDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

// Truck collaboration data type from the main component
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
}

interface TruckReplacementProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTruck: TruckCollaboration | null;
  transporters: string[];
  suppliers: string[];
  onTruckReplaced: () => void; // Callback to refresh truck data
}

const TruckReplacement = ({ isOpen, onClose, selectedTruck, transporters, suppliers, onTruckReplaced }: TruckReplacementProps) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // State for the replacement truck
  const [replacementTruck, setReplacementTruck] = useState({
    driverName: "",
    driverMobile: "",
    driverLicense: "",
    vehicleNumber: "",
    transporter: "",
    supplierName: "",
    reasonForReplacement: ""
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setReplacementTruck(prev => ({ ...prev, [id]: value }));
  };

  // Handle select changes
  const handleSelectChange = (value: string, field: string) => {
    setReplacementTruck(prev => ({ ...prev, [field]: value }));
  };

  // Reset form
  const resetForm = () => {
    setReplacementTruck({
      driverName: "",
      driverMobile: "",
      driverLicense: "",
      vehicleNumber: "",
      transporter: "",
      supplierName: "",
      reasonForReplacement: ""
    });
  };

  // Handle form submission
  const handleReplaceTruckSubmit = async () => {
    if (!selectedTruck || !currentUser) {
      toast({
        title: "Error",
        description: "No truck selected for replacement.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Validate required fields
      if (!replacementTruck.driverName || 
          !replacementTruck.driverMobile || 
          !replacementTruck.vehicleNumber || 
          !replacementTruck.reasonForReplacement) {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // Create transshipment record with original truck info
      const originalTruckInfo = {
        vehicleNumber: selectedTruck.vehicleNumber,
        driverName: selectedTruck.driverName,
        driverMobile: selectedTruck.driverMobile,
        driverLicense: selectedTruck.driverLicense,
        transporter: selectedTruck.transporter,
        replacedAt: serverTimestamp(),
        replacedBy: currentUser.uid,
        reasonForReplacement: replacementTruck.reasonForReplacement
      };

      // Update the truck in Firestore with new information and transshipment flag
      const truckRef = doc(db, "transporterCollaborations", selectedTruck.id);
      await updateDoc(truckRef, {
        vehicleNumber: replacementTruck.vehicleNumber,
        driverName: replacementTruck.driverName,
        driverMobile: replacementTruck.driverMobile,
        driverLicense: replacementTruck.driverLicense,
        transporter: replacementTruck.transporter || selectedTruck.transporter,
        supplierName: replacementTruck.supplierName || selectedTruck.supplierName,
        isTransshipment: true,
        originalTruckInfo: originalTruckInfo,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      });

      // Show success message
      toast({
        title: "Truck replaced",
        description: "The truck has been replaced successfully.",
      });

      // Reset form and close modal
      resetForm();
      onClose();
      
      // Call callback to refresh truck data
      onTruckReplaced();

    } catch (error) {
      console.error("Error replacing truck:", error);
      toast({
        title: "Error",
        description: "Failed to replace truck. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Replace Truck (Transshipment)</DialogTitle>
          <DialogDescription>
            Enter the details of the replacement truck. The original truck information will be saved as transshipment history.
          </DialogDescription>
        </DialogHeader>

        {selectedTruck && (
          <div className="bg-amber-50 p-4 rounded-md mb-4">
            <h3 className="font-semibold text-amber-800 mb-2">Original Truck Information</h3>
            <p className="text-sm text-gray-700 mb-1"><span className="font-semibold">Vehicle Number:</span> {selectedTruck.vehicleNumber}</p>
            <p className="text-sm text-gray-700 mb-1"><span className="font-semibold">Driver:</span> {selectedTruck.driverName}</p>
            <p className="text-sm text-gray-700 mb-1"><span className="font-semibold">Contact:</span> {selectedTruck.driverMobile}</p>
            <p className="text-sm text-gray-700"><span className="font-semibold">Transporter:</span> {selectedTruck.transporter}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="driverName">Driver Name<span className="text-red-500">*</span></Label>
            <Input 
              id="driverName" 
              value={replacementTruck.driverName}
              onChange={handleInputChange}
              placeholder="Driver Name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="driverMobile">Driver Mobile Number<span className="text-red-500">*</span></Label>
            <Input 
              id="driverMobile" 
              value={replacementTruck.driverMobile}
              onChange={handleInputChange}
              placeholder="Driver Mobile Number"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="driverLicense">Driver License Number</Label>
            <Input 
              id="driverLicense" 
              value={replacementTruck.driverLicense}
              onChange={handleInputChange}
              placeholder="Driver License Number"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="vehicleNumber">Vehicle Number<span className="text-red-500">*</span></Label>
            <Input 
              id="vehicleNumber" 
              value={replacementTruck.vehicleNumber}
              onChange={handleInputChange}
              placeholder="Vehicle Number"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="transporter">Transporter</Label>
            <Select
              value={replacementTruck.transporter}
              onValueChange={(value) => handleSelectChange(value, 'transporter')}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select transporter" />
              </SelectTrigger>
              <SelectContent>
                {transporters.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="supplierName">Supplier Name</Label>
            <Select
              value={replacementTruck.supplierName}
              onValueChange={(value) => handleSelectChange(value, 'supplierName')}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reasonForReplacement">Reason for Replacement<span className="text-red-500">*</span></Label>
            <Input 
              id="reasonForReplacement" 
              value={replacementTruck.reasonForReplacement}
              onChange={handleInputChange}
              placeholder="Reason for replacement (e.g., breakdown, accident)"
            />
          </div>
        </div>
        
        <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button 
            variant="outline" 
            onClick={() => {
              resetForm();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button 
            className="bg-ilp-navy hover:bg-ilp-navy/90 text-white"
            onClick={handleReplaceTruckSubmit}
          >
            Replace Truck
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TruckReplacement; 