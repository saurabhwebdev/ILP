import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  where,
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { format } from "date-fns";
import {
  MessageSquare,
  ThumbsUp,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Search,
  MessagesSquare,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Feedback interface
interface Feedback {
  id: string;
  type: string;
  subject: string;
  message: string;
  rating: number;
  userId: string;
  userEmail: string;
  createdAt: any;
  status: "pending" | "reviewed" | "addressed";
  adminResponse?: string;
  reviewedAt?: any;
  reviewedBy?: string;
}

const FeedbackList = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Modal states
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");
  
  // Load feedback data
  useEffect(() => {
    fetchFeedback();
  }, []);
  
  // Fetch feedback from Firestore
  const fetchFeedback = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Create query
      const feedbackRef = collection(db, "feedback");
      const feedbackQuery = query(
        feedbackRef,
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(feedbackQuery);
      const feedbackData: Feedback[] = [];
      
      snapshot.forEach((doc) => {
        feedbackData.push({
          id: doc.id,
          ...doc.data()
        } as Feedback);
      });
      
      setFeedbackItems(feedbackData);
      
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast({
        title: "Error",
        description: "Failed to load feedback data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Format date
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
  
  // Open response modal
  const openResponseModal = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setAdminResponse(feedback.adminResponse || "");
    setIsResponseModalOpen(true);
  };
  
  // Open delete confirmation
  const openDeleteConfirm = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setIsDeleteConfirmOpen(true);
  };
  
  // Handle updating feedback status
  const updateFeedbackStatus = async (feedbackId: string, newStatus: "pending" | "reviewed" | "addressed") => {
    if (!currentUser) return;
    
    try {
      const feedbackRef = doc(db, "feedback", feedbackId);
      
      await updateDoc(feedbackRef, {
        status: newStatus,
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser.uid
      });
      
      // Update local state
      setFeedbackItems(prevItems => 
        prevItems.map(item => 
          item.id === feedbackId ? { ...item, status: newStatus } : item
        )
      );
      
      toast({
        title: "Status updated",
        description: `Feedback status updated to ${newStatus}.`,
      });
      
    } catch (error) {
      console.error("Error updating feedback status:", error);
      toast({
        title: "Update failed",
        description: "Failed to update feedback status.",
        variant: "destructive",
      });
    }
  };
  
  // Handle submitting admin response
  const submitAdminResponse = async () => {
    if (!currentUser || !selectedFeedback) return;
    
    try {
      const feedbackRef = doc(db, "feedback", selectedFeedback.id);
      
      await updateDoc(feedbackRef, {
        adminResponse: adminResponse.trim(),
        status: "addressed",
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser.uid
      });
      
      // Update local state
      setFeedbackItems(prevItems => 
        prevItems.map(item => 
          item.id === selectedFeedback.id 
            ? { 
                ...item, 
                adminResponse: adminResponse.trim(), 
                status: "addressed" 
              } 
            : item
        )
      );
      
      toast({
        title: "Response submitted",
        description: "Your response has been saved and feedback marked as addressed.",
      });
      
      setIsResponseModalOpen(false);
      
    } catch (error) {
      console.error("Error submitting response:", error);
      toast({
        title: "Submission failed",
        description: "Failed to submit your response.",
        variant: "destructive",
      });
    }
  };
  
  // Handle deleting feedback
  const deleteFeedback = async () => {
    if (!selectedFeedback) return;
    
    try {
      const feedbackRef = doc(db, "feedback", selectedFeedback.id);
      await deleteDoc(feedbackRef);
      
      // Update local state
      setFeedbackItems(prevItems => 
        prevItems.filter(item => item.id !== selectedFeedback.id)
      );
      
      toast({
        title: "Feedback deleted",
        description: "The feedback has been permanently deleted.",
      });
      
      setIsDeleteConfirmOpen(false);
      
    } catch (error) {
      console.error("Error deleting feedback:", error);
      toast({
        title: "Deletion failed",
        description: "Failed to delete the feedback.",
        variant: "destructive",
      });
    }
  };
  
  // Get feedback type badge
  const getFeedbackTypeBadge = (type: string) => {
    switch (type) {
      case 'suggestion':
        return <Badge className="bg-blue-100 text-blue-800">Suggestion</Badge>;
      case 'bug':
        return <Badge className="bg-red-100 text-red-800">Bug Report</Badge>;
      case 'question':
        return <Badge className="bg-purple-100 text-purple-800">Question</Badge>;
      case 'praise':
        return <Badge className="bg-green-100 text-green-800">Praise</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Other</Badge>;
    }
  };
  
  // Get feedback status badge
  const getFeedbackStatusBadge = (status: string) => {
    switch (status) {
      case 'addressed':
        return <Badge className="bg-green-100 text-green-800">Addressed</Badge>;
      case 'reviewed':
        return <Badge className="bg-blue-100 text-blue-800">Reviewed</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };
  
  // Get rating stars
  const getRatingStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < rating) {
        stars.push(
          <span key={i} className="text-yellow-500">★</span>
        );
      } else {
        stars.push(
          <span key={i} className="text-gray-300">★</span>
        );
      }
    }
    return <div className="flex">{stars}</div>;
  };
  
  // Filter feedback items
  const filteredFeedback = feedbackItems.filter(item => {
    const matchesSearch = 
      (item.subject?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (item.message?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (item.userEmail?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search feedback..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center">
            <Filter className="h-4 w-4 mr-1 text-gray-500" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="suggestion">Suggestions</SelectItem>
                <SelectItem value="bug">Bug Reports</SelectItem>
                <SelectItem value="question">Questions</SelectItem>
                <SelectItem value="praise">Praise</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center">
            <Filter className="h-4 w-4 mr-1 text-gray-500" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="addressed">Addressed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchFeedback}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredFeedback.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MessagesSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">No feedback found</p>
          <p className="text-sm">Try adjusting your filters or search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredFeedback.map(feedback => (
            <Card key={feedback.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl">{feedback.subject || "No Subject"}</CardTitle>
                    <CardDescription>
                      From: {feedback.userEmail} • {formatDate(feedback.createdAt)}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getFeedbackTypeBadge(feedback.type)}
                    {getFeedbackStatusBadge(feedback.status)}
                    <div className="flex items-center">
                      {getRatingStars(feedback.rating)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-line">{feedback.message}</p>
                
                {feedback.adminResponse && (
                  <div className="mt-4 bg-blue-50 p-3 rounded-md border border-blue-100">
                    <p className="text-sm font-medium text-blue-700 mb-1">Admin Response:</p>
                    <p className="text-gray-700 text-sm">{feedback.adminResponse}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                {feedback.status === "pending" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => updateFeedbackStatus(feedback.id, "reviewed")}
                    className="text-blue-600"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Mark as Reviewed
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openResponseModal(feedback)}
                  className="text-green-600"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {feedback.adminResponse ? "Edit Response" : "Respond"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openDeleteConfirm(feedback)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Response Modal */}
      {selectedFeedback && (
        <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Respond to Feedback</DialogTitle>
              <DialogDescription>
                Your response will be stored with the feedback and the ticket will be marked as addressed.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm font-medium">Original Feedback:</p>
                <p className="text-gray-700">{selectedFeedback.message}</p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="adminResponse" className="block text-sm font-medium">
                  Your Response
                </label>
                <textarea
                  id="adminResponse"
                  className="w-full h-32 p-3 border rounded-md"
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Enter your response to this feedback..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResponseModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitAdminResponse} disabled={!adminResponse.trim()}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Submit Response
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feedback? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteFeedback}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FeedbackList; 