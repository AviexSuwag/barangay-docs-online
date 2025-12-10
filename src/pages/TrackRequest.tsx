import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { searchDocumentRequests, getZoneById } from "@/lib/offlineDb";
import { ArrowLeft, Loader2, Search, CheckCircle, XCircle, Clock, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";

const TrackRequest = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [requests, setRequests] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchValue.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter your reference number to track your request.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    const data = await searchDocumentRequests(searchValue);

    // Fetch zone names for each request
    const requestsWithZones = await Promise.all(
      data.map(async (req) => {
        const zone = req.zone_id ? await getZoneById(req.zone_id) : null;
        return { ...req, zones: zone };
      })
    );

    setLoading(false);

    if (requestsWithZones.length === 0) {
      toast({
        title: "No Requests Found",
        description: "No requests found with this reference number. Please check and try again.",
      });
      setRequests([]);
      return;
    }

    setRequests(requestsWithZones);
  };

  const copyReferenceNumber = (refNum: string) => {
    navigator.clipboard.writeText(refNum);
    toast({
      title: "Copied!",
      description: "Reference number copied to clipboard.",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-warning" />;
    }
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

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "zone_clearance":
        return "Zone Clearance";
      case "clearance":
        return "Barangay Clearance";
      case "indigency":
        return "Barangay Indigency";
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Track Your Request</CardTitle>
            <CardDescription>
              Enter your reference number to view the status of your document request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="track_search">Reference Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="track_search"
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="e.g., ZC-20241210-1234"
                    required
                    className="flex-1"
                  />
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the reference number you received when you submitted your request
                </p>
              </div>
            </form>

            {requests.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Your Request</h3>
                {requests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(request.status)}
                          <div>
                            <p className="font-semibold">
                              {getDocumentTypeLabel(request.document_type)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Submitted on {new Date(request.request_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Name</p>
                          <p className="font-medium">
                            {request.first_name} {request.last_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Zone</p>
                          <p className="font-medium">{request.zones?.zone_name || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Purpose</p>
                          <p className="font-medium">{request.purpose}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Contact</p>
                          <p className="font-medium">{request.contact}</p>
                        </div>
                      </div>

                      {request.reference_number && (
                        <div className="mt-4 p-4 bg-primary/10 border-2 border-primary/20 rounded-lg">
                          <p className="text-sm font-medium mb-2">Reference Number:</p>
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-primary">{request.reference_number}</p>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => copyReferenceNumber(request.reference_number)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Present this reference number when claiming your document at the barangay office.
                          </p>
                        </div>
                      )}

                      {request.status === "rejected" && request.rejection_reason && (
                        <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                          <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                          <p className="text-sm text-destructive/80">{request.rejection_reason}</p>
                        </div>
                      )}

                      {request.status === "approved" && (
                        <div className="mt-4 p-3 bg-success/10 rounded-lg">
                          <p className="text-sm text-success">
                            ✓ Your document is ready for pickup at the Barangay Hall during office hours.
                          </p>
                        </div>
                      )}

                      {request.status === "pending" && (
                        <div className="mt-4 p-3 bg-warning/10 rounded-lg">
                          <p className="text-sm text-warning">
                            ⏳ Your request is being processed. Please check back later.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TrackRequest;