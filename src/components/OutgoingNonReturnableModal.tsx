import React, { useState } from "react";
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
import { doc, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { CornerRightUp, Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OutgoingNonReturnableModalProps {
  isOpen: boolean;
  onClose: () => void;
  truck: any; // TruckCollaboration
  onProcessingComplete: () => void;
}

interface MaterialItem {
  id: string;
  description: string;
  quantity: string;
  unit: string;
}

const OutgoingNonReturnableModal = ({ 
  isOpen, 
  onClose, 
  truck, 
  onProcessingComplete 
}: OutgoingNonReturnableModalProps) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [gatePassNumber, setGatePassNumber] = useState("");
  const [takenBy, setTakenBy] = useState("");
  const [authorizeBy, setAuthorizeBy] = useState("");
  
  // Material items
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [currentItem, setCurrentItem] = useState<{
    description: string;
    quantity: string;
    unit: string;
  }>({
    description: "",
    quantity: "",
    unit: "KG"
  });

  // Add a new material item
  const handleAddItem = () => {
    if (!currentItem.description || !currentItem.quantity) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required item fields",
        variant: "destructive"
      });
      return;
    }

    const newItem: MaterialItem = {
      id: Date.now().toString(),
      description: currentItem.description,
      quantity: currentItem.quantity,
      unit: currentItem.unit
    };

    setItems([...items, newItem]);
    
    // Reset current item fields
    setCurrentItem({
      description: "",
      quantity: "",
      unit: "KG"
    });
  };

  // Remove a material item
  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  // Submit the form
  const handleSubmit = async () => {
    if (!truck?.id || !currentUser) {
      toast({
        title: "Error",
        description: "Missing truck information or user credentials",
        variant: "destructive"
      });
      return;
    }

    // Validate required fields
    if (!fromLocation || !toLocation || !invoiceNumber || !gatePassNumber || !takenBy || !authorizeBy) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "No Items",
        description: "Please add at least one material item",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create the outgoing register record
      const outgoingRegisterData = {
        truckId: truck.id,
        truckNumber: truck.truckNumber,
        vehicleNumber: truck.vehicleNumber,
        driverName: truck.driverName,
        driverLicense: truck.driverLicense,
        fromLocation,
        toLocation,
        invoiceNumber,
        gatePassNumber,
        takenBy,
        authorizeBy,
        items,
        type: "NonReturnable",
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        status: "Completed"
      };

      // Update the truck document with outgoing register information
      const truckRef = doc(db, "transporterCollaborations", truck.id);
      await updateDoc(truckRef, {
        outgoingRegisters: arrayUnion(outgoingRegisterData),
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.uid
      });
      
      toast({
        title: "Success",
        description: "Outgoing Non-Returnable Register completed successfully",
      });
      
      onProcessingComplete();
      onClose();
    } catch (error) {
      console.error("Error processing outgoing non-returnable register:", error);
      toast({
        title: "Error",
        description: "Failed to process outgoing non-returnable register",
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
            <CornerRightUp className="h-5 w-5 text-amber-600" />
            Outgoing Non-Returnable Register
          </DialogTitle>
        </DialogHeader>
        
        {/* Truck Info Header */}
        <div className="bg-amber-50 p-4 rounded-md mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Truck Details</h3>
            <div className="flex items-center">
              <span className="bg-amber-100 text-amber-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-amber-400">
                {truck?.status || 'Inside'}
              </span>
              <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded border border-gray-400">
                {truck?.vehicleNumber || 'Unknown'}
              </span>
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
          </div>
        </div>
        
        {/* Outgoing Non-Returnable Form */}
        <div className="border rounded-md p-4 mb-6">
          <h3 className="font-medium text-lg mb-4">Outgoing Non-Returnable Form</h3>
          
          {/* First Row: From, To, Invoice Number */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="fromLocation" className="block text-sm font-medium text-gray-700 mb-1">
                From
              </label>
              <Input
                id="fromLocation"
                placeholder="From"
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="toLocation" className="block text-sm font-medium text-gray-700 mb-1">
                To
              </label>
              <Input
                id="toLocation"
                placeholder="To"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number
              </label>
              <Input
                id="invoiceNumber"
                placeholder="Enter Invoice Number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
          </div>
          
          {/* Second Row: Gate Pass Number, Taken By, Authorize By */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label htmlFor="gatePassNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Gate Pass Number
              </label>
              <Input
                id="gatePassNumber"
                placeholder="Enter Gate Pass Number"
                value={gatePassNumber}
                onChange={(e) => setGatePassNumber(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="takenBy" className="block text-sm font-medium text-gray-700 mb-1">
                Taken By
              </label>
              <Input
                id="takenBy"
                placeholder="Enter Taken By"
                value={takenBy}
                onChange={(e) => setTakenBy(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="authorizeBy" className="block text-sm font-medium text-gray-700 mb-1">
                Authorize By
              </label>
              <Input
                id="authorizeBy"
                placeholder="Enter Authorize By"
                value={authorizeBy}
                onChange={(e) => setAuthorizeBy(e.target.value)}
              />
            </div>
          </div>
          
          {/* Items Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Items</h4>
              <Button 
                size="sm" 
                variant="outline" 
                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                onClick={handleAddItem}
              >
                Add Items
              </Button>
            </div>
            
            {/* Item Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-4 items-end">
              <div className="md:col-span-5">
                <Input
                  placeholder="Material Description"
                  value={currentItem.description}
                  onChange={(e) => setCurrentItem({...currentItem, description: e.target.value})}
                />
              </div>
              
              <div className="md:col-span-3">
                <Input
                  type="number"
                  placeholder="Enter Quantity"
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                />
              </div>
              
              <div className="md:col-span-3">
                <Select
                  value={currentItem.unit}
                  onValueChange={(value) => setCurrentItem({...currentItem, unit: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="Tonnes">Tonnes</SelectItem>
                    <SelectItem value="Pieces">Pieces</SelectItem>
                    <SelectItem value="Liters">Liters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-1">
                <Button 
                  className="w-full" 
                  size="icon"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Items Table */}
            {items.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Truck Number</TableHead>
                      <TableHead>Driver Name</TableHead>
                      <TableHead>Driver License Number</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Authorize By</TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{truck?.truckNumber || 'N/A'}</TableCell>
                        <TableCell>{truck?.driverName || 'N/A'}</TableCell>
                        <TableCell>{truck?.driverLicense || 'N/A'}</TableCell>
                        <TableCell>{fromLocation}</TableCell>
                        <TableCell>{toLocation}</TableCell>
                        <TableCell>{invoiceNumber}</TableCell>
                        <TableCell>{authorizeBy}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          No data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Material Items List */}
            {items.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Material Items</h5>
                <ul className="border rounded-md divide-y">
                  {items.map((item) => (
                    <li key={item.id} className="flex justify-between items-center p-3">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-gray-500">
                          {item.quantity} {item.unit}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveItem(item.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {submitting ? "Processing..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OutgoingNonReturnableModal; 