import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Reply, Plus, MessageCircle, Users } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  recipient_id?: string;
  recipient_role?: string;
  title: string;
  content: string;
  message_type: string;
  read_at?: string;
  created_at: string;
  sender_profile?: {
    first_name: string;
    last_name: string;
    role: string;
  };
  recipient_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  replies?: MessageReply[];
}

interface MessageReply {
  id: string;
  message_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_profile?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface MessagingTabProps {
  onRefreshStats: () => void;
}

const MessagingTab = ({ onRefreshStats }: MessagingTabProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [formData, setFormData] = useState({
    recipient_type: "individual" as "individual" | "role",
    recipient_id: "",
    recipient_role: "",
    title: "",
    content: "",
    message_type: "notification",
  });
  const { toast } = useToast();

  const roleOptions = ["student", "staff", "resident", "member", "visitor"];

  useEffect(() => {
    fetchMessages();
    fetchUsers();
  }, []);

  const fetchMessages = async () => {
    try {
      // Fetch messages first
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for each message
      const messagesWithProfiles = [];
      for (const message of messagesData || []) {
        // Get sender profile
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name, role")
          .eq("user_id", message.sender_id)
          .single();

        // Get recipient profile if it's an individual message
        let recipientProfile = null;
        if (message.recipient_id) {
          const { data: recipProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name, email")
            .eq("user_id", message.recipient_id)
            .single();
          recipientProfile = recipProfile;
        }

        messagesWithProfiles.push({
          ...message,
          sender_profile: senderProfile,
          recipient_profile: recipientProfile,
        });
      }

      setMessages(messagesWithProfiles);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, email, first_name, last_name, role")
        .eq("status", "active")
        .order("first_name", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchMessageReplies = async (messageId: string) => {
    try {
      // Fetch replies first
      const { data: repliesData, error } = await supabase
        .from("message_replies")
        .select("*")
        .eq("message_id", messageId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch sender profiles for each reply
      const repliesWithProfiles = [];
      for (const reply of repliesData || []) {
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name, role")
          .eq("user_id", reply.sender_id)
          .single();

        repliesWithProfiles.push({
          ...reply,
          sender_profile: senderProfile,
        });
      }

      return repliesWithProfiles;
    } catch (error) {
      console.error("Error fetching replies:", error);
      return [];
    }
  };

  const resetForm = () => {
    setFormData({
      recipient_type: "individual",
      recipient_id: "",
      recipient_role: "",
      title: "",
      content: "",
      message_type: "notification",
    });
  };

  const handleSendMessage = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user?.id) throw new Error("No authenticated user");

      const messageData = {
        sender_id: currentUser.user.id,
        title: formData.title,
        content: formData.content,
        message_type: formData.message_type,
        ...(formData.recipient_type === "individual"
          ? { recipient_id: formData.recipient_id }
          : { recipient_role: formData.recipient_role }),
      };

      const { error } = await supabase
        .from("messages")
        .insert([messageData]);

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
      });

      fetchMessages();
      onRefreshStats();
      setShowComposeDialog(false);
      resetForm();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleReply = async (messageId: string) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user?.id) throw new Error("No authenticated user");

      const { error } = await supabase
        .from("message_replies")
        .insert([{
          message_id: messageId,
          sender_id: currentUser.user.id,
          content: replyContent,
        }]);

      if (error) throw error;

      toast({
        title: "Reply Sent",
        description: "Your reply has been sent successfully",
      });

      setReplyContent("");
      // Refresh the selected message with new replies
      if (selectedMessage) {
        const replies = await fetchMessageReplies(messageId);
        setSelectedMessage({ ...selectedMessage, replies });
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    }
  };

  const openMessageDialog = async (message: Message) => {
    const replies = await fetchMessageReplies(message.id);
    setSelectedMessage({ ...message, replies });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Messages & Notifications
          </CardTitle>
          <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Compose Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Compose New Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Recipient Type</Label>
                  <Select
                    value={formData.recipient_type}
                    onValueChange={(value: "individual" | "role") =>
                      setFormData(prev => ({ ...prev, recipient_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual User</SelectItem>
                      <SelectItem value="role">User Role (Broadcast)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.recipient_type === "individual" ? (
                  <div>
                    <Label>Recipient</Label>
                    <Select
                      value={formData.recipient_id}
                      onValueChange={(value) =>
                        setFormData(prev => ({ ...prev, recipient_id: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.first_name} {user.last_name} ({user.role}) - {user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label>Target Role</Label>
                    <Select
                      value={formData.recipient_role}
                      onValueChange={(value) =>
                        setFormData(prev => ({ ...prev, recipient_role: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="title">Subject</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Message subject"
                  />
                </div>

                <div>
                  <Label htmlFor="content">Message</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Type your message here..."
                    rows={5}
                  />
                </div>

                <div>
                  <Label>Message Type</Label>
                  <Select
                    value={formData.message_type}
                    onValueChange={(value) =>
                      setFormData(prev => ({ ...prev, message_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSendMessage} className="flex-1">
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowComposeDialog(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="font-medium">{message.title}</TableCell>
                  <TableCell>
                    {message.recipient_profile ? (
                      <div>
                        <div>{message.recipient_profile.first_name} {message.recipient_profile.last_name}</div>
                        <div className="text-sm text-muted-foreground">{message.recipient_profile.email}</div>
                      </div>
                    ) : (
                      <Badge variant="outline">
                        <Users className="w-3 h-3 mr-1" />
                        {message.recipient_role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{message.message_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(message.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={message.read_at ? "default" : "secondary"}>
                      {message.read_at ? "Read" : "Unread"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openMessageDialog(message)}
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Message Detail Dialog */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedMessage.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">
                      From: {selectedMessage.sender_profile?.first_name} {selectedMessage.sender_profile?.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedMessage.sender_profile?.role}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(selectedMessage.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="whitespace-pre-wrap">{selectedMessage.content}</div>
              </div>

              {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Replies</h4>
                  {selectedMessage.replies.map((reply) => (
                    <div key={reply.id} className="p-3 bg-background border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-sm">
                          {reply.sender_profile?.first_name} {reply.sender_profile?.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(reply.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{reply.content}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reply">Reply</Label>
                <Textarea
                  id="reply"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply..."
                  rows={3}
                />
                <Button onClick={() => handleReply(selectedMessage.id)} disabled={!replyContent.trim()}>
                  <Reply className="w-4 h-4 mr-2" />
                  Send Reply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MessagingTab;