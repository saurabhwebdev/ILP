import React, { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, X, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ShiftHandover = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fromShift, setFromShift] = useState({
    name: "",
    shift: ""
  });
  const [toShift, setToShift] = useState({
    name: "",
    shift: ""
  });
  const [items, setItems] = useState<{
    id: string;
    item: string;
    quantity: string;
    remarks: string;
  }[]>([]);
  const [newItem, setNewItem] = useState({
    item: "",
    quantity: "",
    remarks: ""
  });
  const [handoverHistory, setHandoverHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHandover, setExpandedHandover] = useState<string | null>(null);

  // Fetch handover history when component loads
  useEffect(() => {
    fetchHandoverHistory();
  }, []);

  const fetchHandoverHistory = async () => {
    try {
      setLoadingHistory(true);
      const handoversRef = collection(db, "shiftHandovers");
      const q = query(handoversRef, orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      
      const handovers: any[] = [];
      querySnapshot.forEach((doc) => {
        handovers.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date()
        });
      });
      
      setHandoverHistory(handovers);
    } catch (error) {
      console.error("Error fetching handover history:", error);
      toast({
        title: "Error",
        description: "Failed to load handover history. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFromShiftChange = (field: string, value: string) => {
    setFromShift({ ...fromShift, [field]: value });
  };

  const handleToShiftChange = (field: string, value: string) => {
    setToShift({ ...toShift, [field]: value });
  };

  const handleNewItemChange = (field: string, value: string) => {
    setNewItem({ ...newItem, [field]: value });
  };

  const addItem = () => {
    if (!newItem.item || !newItem.quantity) {
      toast({
        title: "Missing information",
        description: "Item name and quantity are required",
        variant: "destructive"
      });
      return;
    }

    setItems([
      ...items,
      {
        id: Date.now().toString(),
        ...newItem
      }
    ]);
    setNewItem({
      item: "",
      quantity: "",
      remarks: ""
    });
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const submitHandover = async () => {
    // Validation
    if (!fromShift.name || !fromShift.shift || !toShift.name || !toShift.shift) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "No items added",
        description: "Please add at least one item to handover",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Create document in Firestore
      await addDoc(collection(db, "shiftHandovers"), {
        fromShift,
        toShift,
        items,
        timestamp: serverTimestamp()
      });

      // Success toast
      toast({
        title: "Handover submitted",
        description: "Shift handover has been successfully recorded",
      });

      // Reset form
      setFromShift({ name: "", shift: "" });
      setToShift({ name: "", shift: "" });
      setItems([]);
      
      // Refresh handover history
      fetchHandoverHistory();
      
    } catch (error) {
      console.error("Error submitting handover:", error);
      toast({
        title: "Error",
        description: "Failed to submit shift handover. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Toggle expanded handover details
  const toggleHandoverDetails = (handoverId: string) => {
    if (expandedHandover === handoverId) {
      setExpandedHandover(null);
    } else {
      setExpandedHandover(handoverId);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <h1 className="text-2xl font-bold mb-6">Shift Handover</h1>
      
      <Tabs defaultValue="new" className="mb-6">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="new">New Handover</TabsTrigger>
          <TabsTrigger value="history">Handover History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="new">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
            <div className="bg-white p-6 rounded-md shadow-sm border">
              <h2 className="text-lg font-semibold mb-4 text-ilp-navy">From Shift</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="fromName" className="block text-sm font-medium mb-1">Name</label>
                  <Input
                    id="fromName"
                    placeholder="Enter Name"
                    value={fromShift.name}
                    onChange={(e) => handleFromShiftChange("name", e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="fromShift" className="block text-sm font-medium mb-1">Select Shift</label>
                  <select
                    id="fromShift"
                    className="w-full p-2 border rounded-md"
                    value={fromShift.shift}
                    onChange={(e) => handleFromShiftChange("shift", e.target.value)}
                  >
                    <option value="">Select Shift</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Night">Night</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-md shadow-sm border">
              <h2 className="text-lg font-semibold mb-4 text-ilp-navy">To Shift</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="toName" className="block text-sm font-medium mb-1">Name</label>
                  <Input
                    id="toName"
                    placeholder="Enter Name"
                    value={toShift.name}
                    onChange={(e) => handleToShiftChange("name", e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="toShift" className="block text-sm font-medium mb-1">Select Shift</label>
                  <select
                    id="toShift"
                    className="w-full p-2 border rounded-md"
                    value={toShift.shift}
                    onChange={(e) => handleToShiftChange("shift", e.target.value)}
                  >
                    <option value="">Select Shift</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Night">Night</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-md shadow-sm border mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-ilp-navy">Add Items</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="itemName" className="block text-sm font-medium mb-1">Item Name</label>
                <Input
                  id="itemName"
                  placeholder="Enter Item"
                  value={newItem.item}
                  onChange={(e) => handleNewItemChange("item", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium mb-1">Quantity</label>
                <Input
                  id="quantity"
                  placeholder="Enter Quantity"
                  value={newItem.quantity}
                  onChange={(e) => handleNewItemChange("quantity", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="remarks" className="block text-sm font-medium mb-1">Remarks</label>
                <Input
                  id="remarks"
                  placeholder="Enter Remarks"
                  value={newItem.remarks}
                  onChange={(e) => handleNewItemChange("remarks", e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              type="button" 
              onClick={addItem}
              className="bg-ilp-blue hover:bg-ilp-navy text-white flex items-center gap-2"
            >
              <PlusCircle size={16} />
              Add
            </Button>
          </div>
          
          {items.length > 0 && (
            <div className="bg-white p-6 rounded-md shadow-sm border mb-6">
              <h2 className="text-lg font-semibold mb-4 text-ilp-navy">Items to Handover</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.item}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.remarks}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeItem(item.id)}
                            className="text-ilp-red hover:text-ilp-burgundy"
                          >
                            <X size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button
              onClick={submitHandover}
              disabled={loading}
              className="bg-ilp-burgundy hover:bg-ilp-navy text-white"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <div className="bg-white p-6 rounded-md shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-ilp-navy">Handover History</h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchHandoverHistory}
                disabled={loadingHistory}
                className="flex items-center gap-1"
              >
                <RefreshCw size={14} className={loadingHistory ? "animate-spin" : ""} />
                <span>Refresh</span>
              </Button>
            </div>
            
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ilp-burgundy"></div>
              </div>
            ) : handoverHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No handover records found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {handoverHistory.map((handover) => (
                      <React.Fragment key={handover.id}>
                        <tr 
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(handover.timestamp)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="font-medium">{handover.fromShift.name}</div>
                            <div className="text-gray-500">{handover.fromShift.shift}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="font-medium">{handover.toShift.name}</div>
                            <div className="text-gray-500">{handover.toShift.shift}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="flex items-center justify-between">
                              <span>{handover.items.length} {handover.items.length === 1 ? 'item' : 'items'}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleHandoverDetails(handover.id)}
                                className="ml-2 text-ilp-blue hover:text-ilp-navy"
                              >
                                {expandedHandover === handover.id ? 
                                  <span className="flex items-center gap-1">Hide <ChevronUp size={14} /></span> : 
                                  <span className="flex items-center gap-1">Details <ChevronDown size={14} /></span>
                                }
                              </Button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded details */}
                        {expandedHandover === handover.id && (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 bg-gray-50">
                              <div className="text-sm">
                                <h3 className="font-medium text-gray-900 mb-2">Handover Items</h3>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {handover.items.map((item: any, idx: number) => (
                                        <tr key={idx}>
                                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.item}</td>
                                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.remarks}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShiftHandover; 