import React, { useState } from "react";
import { X, Send, ThumbsUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  // Feedback form state
  const [feedbackType, setFeedbackType] = useState<string>("suggestion");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [rating, setRating] = useState<string>("5");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  
  // Handle feedback submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit feedback.",
        variant: "destructive",
      });
      return;
    }
    
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter your feedback message.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Save feedback to Firestore
      await addDoc(collection(db, "feedback"), {
        type: feedbackType,
        subject: subject.trim() || "No Subject",
        message: message.trim(),
        rating: parseInt(rating),
        userId: currentUser.uid,
        userEmail: currentUser.email,
        createdAt: serverTimestamp(),
        status: "pending", // pending, reviewed, addressed
      });
      
      setSuccess(true);
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback! We appreciate your input.",
      });
      
      // Reset form after short delay
      setTimeout(() => {
        setFeedbackType("suggestion");
        setSubject("");
        setMessage("");
        setRating("5");
        setSuccess(false);
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Submission failed",
        description: "Failed to submit your feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {success ? (
              <span className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-green-500" />
                Feedback Submitted!
              </span>
            ) : (
              "Share Your Feedback"
            )}
          </DialogTitle>
          <DialogDescription>
            {success 
              ? "Thank you for helping us improve our logistics platform." 
              : "We value your input to improve our logistics platform."}
          </DialogDescription>
        </DialogHeader>
        
        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="feedback-type">Feedback Type</Label>
                <Select 
                  value={feedbackType} 
                  onValueChange={setFeedbackType}
                >
                  <SelectTrigger id="feedback-type">
                    <SelectValue placeholder="Select feedback type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggestion">Suggestion</SelectItem>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="praise">Praise</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Subject (Optional)</Label>
                <Input
                  id="subject"
                  placeholder="Brief subject of your feedback"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Your Feedback</Label>
                <Textarea
                  id="message"
                  placeholder="Please share your detailed feedback here..."
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rating">How would you rate your experience?</Label>
                <Select 
                  value={rating} 
                  onValueChange={setRating}
                >
                  <SelectTrigger id="rating">
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Below Average</SelectItem>
                    <SelectItem value="3">3 - Average</SelectItem>
                    <SelectItem value="4">4 - Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal; 