import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

// Original truck info stored in the transshipment record
interface OriginalTruckInfo {
  vehicleNumber: string;
  driverName: string;
  driverMobile: string;
  driverLicense: string;
  transporter: string;
  replacedAt: any; // Firestore timestamp
  replacedBy: string;
  reasonForReplacement: string;
}

interface TransshipmentDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  originalTruckInfo: OriginalTruckInfo | null;
}

const TransshipmentDetails = ({ isOpen, onClose, originalTruckInfo }: TransshipmentDetailsProps) => {
  // Format timestamp if it exists
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "N/A";
    
    try {
      // Handle Firestore timestamp objects
      if (timestamp.toDate) {
        return format(timestamp.toDate(), "PPpp");
      }
      
      // Handle ISO strings or other date formats
      return format(new Date(timestamp), "PPpp");
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transshipment Details</DialogTitle>
          <DialogDescription>
            This truck replaced another truck that broke down or had issues.
          </DialogDescription>
        </DialogHeader>
        
        {originalTruckInfo ? (
          <div className="py-4">
            <div className="mb-6">
              <h3 className="font-medium text-lg text-amber-800 mb-2">Original Truck Information</h3>
              <div className="space-y-2">
                <p className="text-sm"><span className="font-semibold">Vehicle Number:</span> {originalTruckInfo.vehicleNumber}</p>
                <p className="text-sm"><span className="font-semibold">Driver Name:</span> {originalTruckInfo.driverName}</p>
                <p className="text-sm"><span className="font-semibold">Driver Contact:</span> {originalTruckInfo.driverMobile}</p>
                {originalTruckInfo.driverLicense && (
                  <p className="text-sm"><span className="font-semibold">Driver License:</span> {originalTruckInfo.driverLicense}</p>
                )}
                <p className="text-sm"><span className="font-semibold">Transporter:</span> {originalTruckInfo.transporter}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="font-medium text-lg text-amber-800 mb-2">Replacement Information</h3>
              <div className="space-y-2">
                <p className="text-sm"><span className="font-semibold">Replaced On:</span> {formatTimestamp(originalTruckInfo.replacedAt)}</p>
                <p className="text-sm"><span className="font-semibold">Reason:</span> {originalTruckInfo.reasonForReplacement}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-gray-500">
            No original truck information available
          </div>
        )}
        
        <DialogFooter>
          <Button 
            onClick={onClose}
            className="bg-ilp-navy hover:bg-ilp-navy/90 text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransshipmentDetails; 