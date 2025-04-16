import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface TruckCollaboration {
  id: string;
  truckNumber?: string;
  driverName?: string;
  driverMobile?: string;
  vehicleNumber?: string;
  depotName?: string;
  transporter?: string;
  arrivalDateTime?: any;
  materialType?: string;
  [key: string]: any;
}

interface ExitTruckModalProps {
  isOpen: boolean;
  onClose: () => void;
  truck: TruckCollaboration | null;
  onConfirm: (truckId: string) => Promise<void>;
}

const ExitTruckModal = ({ isOpen, onClose, truck, onConfirm }: ExitTruckModalProps) => {
  const [isLoading, setIsLoading] = React.useState(false);

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

  const handleExitTruck = async () => {
    if (!truck) return;
    
    try {
      setIsLoading(true);
      await onConfirm(truck.id);
      onClose();
    } catch (error) {
      console.error("Error exiting truck:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <ExternalLink className="h-5 w-5" />
            Exit Truck from Weighbridge
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to exit this truck from the weighbridge?
          </DialogDescription>
        </DialogHeader>

        {truck && (
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 flex items-start">
              <AlertTriangle className="text-amber-600 h-5 w-5 mr-2 mt-0.5" />
              <div className="text-sm text-amber-700">
                <p className="font-medium">Warning</p>
                <p>Once a truck exits the weighbridge, it will no longer be managed by the system and will appear in the Weighbridge Exit page.</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="text-sm font-medium mb-2">Truck Details:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Truck Number:</span>
                  <p className="font-medium">{truck.truckNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Vehicle Number:</span>
                  <p className="font-medium">{truck.vehicleNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Driver:</span>
                  <p className="font-medium">{truck.driverName || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Transporter:</span>
                  <p className="font-medium">{truck.transporter || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Arrival Time:</span>
                  <p className="font-medium">{formatDate(truck.arrivalDateTime)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Material Type:</span>
                  <p className="font-medium">{truck.materialType || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExitTruck}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isLoading ? "Processing..." : "Confirm Weighbridge Exit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExitTruckModal; 