import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, CheckCircle, XCircle, Clock, LogOut, Search, Eye, Download } from "lucide-react";
import Header from "@/components/Header";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchRequests();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin");
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("document_requests")
      .select("*, zones(zone_name)")
      .order("request_date", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load requests.",
        variant: "destructive",
      });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (id: string, status: "approved" | "rejected") => {
    const reason = status === "rejected" ? prompt("Please provide a reason for rejection:") : null;
    
    if (status === "rejected" && !reason) {
      return;
    }

    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to perform this action.",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = { 
      status,
      rejection_reason: reason,
      processed_by: session.user.id,
      processed_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("document_requests")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: `Failed to update request status: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Request ${status} successfully.${status === 'approved' ? ' A reference number has been generated.' : ''}`,
      });
      fetchRequests();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge className="bg-warning">Pending</Badge>;
    }
  };

  const viewRequestDetails = (request: any) => {
    setSelectedRequest(request);
    setDetailOpen(true);
  };

  const getFileUrl = async (filePath: string, bucket: string = "zone-clearances") => {
    const { data } = await supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const filteredRequests = requests.filter((req) => {
    const matchesFilter = filter === "all" || req.status === filter;
    const matchesSearch = 
      req.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">Admin Dashboard</h2>
            <p className="text-muted-foreground">Manage document requests</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${filter === "all" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilter("all")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${filter === "pending" ? "ring-2 ring-warning" : ""}`}
            onClick={() => setFilter("pending")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${filter === "approved" ? "ring-2 ring-success" : ""}`}
            onClick={() => setFilter("approved")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${filter === "rejected" ? "ring-2 ring-destructive" : ""}`}
            onClick={() => setFilter("rejected")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <CardTitle>Document Requests</CardTitle>
                <CardDescription>View and manage all document requests</CardDescription>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.first_name} {request.last_name}
                        </TableCell>
                        <TableCell className="capitalize">
                          {request.document_type.replace("_", " ")}
                        </TableCell>
                        <TableCell>{request.zones?.zone_name || "N/A"}</TableCell>
                        <TableCell>{request.purpose}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {new Date(request.request_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewRequestDetails(request)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {request.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-success border-success hover:bg-success hover:text-white"
                                  onClick={() => handleStatusUpdate(request.id, "approved")}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                                  onClick={() => handleStatusUpdate(request.id, "rejected")}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Request Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>
                Full information for this document request
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Reference Number</h4>
                    <p className="text-sm font-semibold">{selectedRequest.reference_number || "Not yet assigned"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                    <div>{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Full Name</h4>
                      <p className="text-sm">{selectedRequest.first_name} {selectedRequest.middle_name || ""} {selectedRequest.last_name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Age</h4>
                      <p className="text-sm">{selectedRequest.age}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Birth Date</h4>
                      <p className="text-sm">{new Date(selectedRequest.birth_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Marital Status</h4>
                      <p className="text-sm capitalize">{selectedRequest.marital_status}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
                      <p className="text-sm">{selectedRequest.contact}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                      <p className="text-sm">{selectedRequest.email || "N/A"}</p>
                    </div>
                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Address</h4>
                      <p className="text-sm">{selectedRequest.address}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Request Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Document Type</h4>
                      <p className="text-sm capitalize">{selectedRequest.document_type?.replace("_", " ")}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Zone</h4>
                      <p className="text-sm">{selectedRequest.zones?.zone_name || "N/A"}</p>
                    </div>
                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Purpose</h4>
                      <p className="text-sm">{selectedRequest.purpose}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Request Date</h4>
                      <p className="text-sm">{new Date(selectedRequest.request_date).toLocaleString()}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Has Zone Clearance</h4>
                      <p className="text-sm">{selectedRequest.has_zone_clearance ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </div>

                {selectedRequest.status === "rejected" && selectedRequest.rejection_reason && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3 text-destructive">Rejection Details</h3>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Reason</h4>
                      <p className="text-sm">{selectedRequest.rejection_reason}</p>
                    </div>
                  </div>
                )}

                {(selectedRequest.valid_id_file_url || selectedRequest.zone_clearance_file_url) && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Uploaded Documents</h3>
                    <div className="flex gap-2">
                      {selectedRequest.valid_id_file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(selectedRequest.valid_id_file_url, "_blank")}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          View Valid ID
                        </Button>
                      )}
                      {selectedRequest.zone_clearance_file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(selectedRequest.zone_clearance_file_url, "_blank")}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          View Zone Clearance
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {selectedRequest.processed_at && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Processing Information</h3>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Processed At</h4>
                      <p className="text-sm">{new Date(selectedRequest.processed_at).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminDashboard;