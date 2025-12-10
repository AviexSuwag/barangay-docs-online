import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { getZones, createDocumentRequest, saveFile, getApprovedZoneClearanceByRefNumber } from "@/lib/offlineDb";
import { ArrowLeft, Loader2, AlertCircle, Upload, CheckCircle, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";

const Indigency = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [zoneClearanceVerified, setZoneClearanceVerified] = useState(false);
  const [verifiedZoneClearance, setVerifiedZoneClearance] = useState<any>(null);
  const [zoneClearanceRefNumber, setZoneClearanceRefNumber] = useState("");
  const [zoneClearanceFile, setZoneClearanceFile] = useState<File | null>(null);
  const [submittedReferenceNumber, setSubmittedReferenceNumber] = useState<string | null>(null);

  useEffect(() => {
    const fetchZones = async () => {
      const data = await getZones();
      setZones(data);
    };
    fetchZones();
  }, []);

  const handleZoneClearanceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setZoneClearanceFile(e.target.files[0]);
    }
  };

  const handleVerifyZoneClearance = async () => {
    if (!zoneClearanceRefNumber.trim()) {
      toast({
        title: "Reference Number Required",
        description: "Please enter your Zone Clearance reference number.",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);

    const data = await getApprovedZoneClearanceByRefNumber(zoneClearanceRefNumber);

    setVerifying(false);

    if (!data) {
      toast({
        title: "Not Found or Not Approved",
        description: "No approved Zone Clearance found with this reference number. Please check the number or wait for approval.",
        variant: "destructive",
      });
      return;
    }

    setZoneClearanceVerified(true);
    setVerifiedZoneClearance(data);
    toast({
      title: "Verified!",
      description: "Your Zone Clearance has been verified successfully.",
    });
  };

  const copyReferenceNumber = () => {
    if (submittedReferenceNumber) {
      navigator.clipboard.writeText(submittedReferenceNumber);
      toast({
        title: "Copied!",
        description: "Reference number copied to clipboard.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!zoneClearanceVerified) {
      toast({
        title: "Verification Required",
        description: "Please verify your Zone Clearance reference number first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    let fileUrl = null;
    if (zoneClearanceFile) {
      fileUrl = await saveFile(zoneClearanceFile);
    }

    const formData = new FormData(e.currentTarget);
    const data = {
      first_name: formData.get("first_name") as string,
      middle_name: formData.get("middle_name") as string,
      last_name: formData.get("last_name") as string,
      age: parseInt(formData.get("age") as string),
      birth_date: formData.get("birth_date") as string,
      address: formData.get("address") as string,
      zone_id: formData.get("zone_id") as string,
      contact: formData.get("contact") as string,
      email: formData.get("email") as string,
      marital_status: formData.get("marital_status") as "single" | "married" | "widowed" | "separated",
      document_type: "indigency" as const,
      purpose: formData.get("purpose") as string,
      has_zone_clearance: true,
      zone_clearance_file_url: fileUrl || undefined,
      zone_clearance_reference: zoneClearanceRefNumber,
    };

    try {
      const result = await createDocumentRequest(data);
      setSubmittedReferenceNumber(result.reference_number);
      toast({
        title: "Success!",
        description: "Your indigency certificate request has been submitted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  // Success screen with reference number
  if (submittedReferenceNumber) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-success" />
              </div>
              <CardTitle className="text-3xl">Request Submitted!</CardTitle>
              <CardDescription>
                Your barangay indigency request has been successfully submitted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-primary/10 border-2 border-primary/20 rounded-lg text-center">
                <p className="text-sm font-medium mb-2">Your Reference Number:</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-3xl font-bold text-primary">{submittedReferenceNumber}</p>
                  <Button variant="ghost" size="icon" onClick={copyReferenceNumber}>
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <p className="font-medium">Important:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Save this reference number. You will need it to track your request.</li>
                  <li>This is a <strong>different</strong> reference number from your Zone Clearance.</li>
                  <li>Present this reference number when claiming your Barangay Indigency at the barangay.</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button asChild className="flex-1">
                  <Link to="/track">Track My Request</Link>
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <Link to="/">Back to Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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
            <CardTitle className="text-3xl">Barangay Indigency Request</CardTitle>
            <CardDescription>
              Fill out the form below to request an indigency certificate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> You need an approved Zone Clearance before you can request a Barangay Indigency.
              </AlertDescription>
            </Alert>

            {/* Zone Clearance Verification Section */}
            <div className="space-y-4 p-4 border-2 rounded-lg bg-muted/20 mb-6">
              <Label className="text-lg font-semibold">Zone Clearance Verification</Label>
              
              {!zoneClearanceVerified ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter your Zone Clearance reference number to verify:
                  </p>
                  <div className="space-y-2">
                    <Input
                      placeholder="e.g., ZC-20241210-1234"
                      value={zoneClearanceRefNumber}
                      onChange={(e) => setZoneClearanceRefNumber(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerifyZoneClearance}
                      disabled={verifying}
                      className="w-full"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify Zone Clearance"
                      )}
                    </Button>
                  </div>
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Don't have a Zone Clearance yet?{" "}
                      <Button variant="link" asChild className="p-0 h-auto">
                        <Link to="/request/zone-clearance">Request one here</Link>
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <Alert className="bg-success/10 border-success/20">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success">
                    Zone Clearance verified! Reference: <strong>{zoneClearanceRefNumber}</strong>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {zoneClearanceVerified && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="zone_clearance_file">Upload Zone Clearance Document (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="zone_clearance_file"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleZoneClearanceFileChange}
                      className="cursor-pointer"
                    />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Accepted formats: Any image or PDF file
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input 
                      id="first_name" 
                      name="first_name" 
                      required 
                      defaultValue={verifiedZoneClearance?.first_name || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middle_name">Middle Name</Label>
                    <Input 
                      id="middle_name" 
                      name="middle_name" 
                      defaultValue={verifiedZoneClearance?.middle_name || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input 
                      id="last_name" 
                      name="last_name" 
                      required 
                      defaultValue={verifiedZoneClearance?.last_name || ""}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age *</Label>
                    <Input 
                      id="age" 
                      name="age" 
                      type="number" 
                      min="1" 
                      max="150" 
                      required 
                      defaultValue={verifiedZoneClearance?.age || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Birth Date *</Label>
                    <Input 
                      id="birth_date" 
                      name="birth_date" 
                      type="date" 
                      required 
                      defaultValue={verifiedZoneClearance?.birth_date || ""}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Complete Address *</Label>
                  <Input 
                    id="address" 
                    name="address" 
                    required 
                    defaultValue={verifiedZoneClearance?.address || ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zone_id">Zone *</Label>
                  <Select name="zone_id" required defaultValue={verifiedZoneClearance?.zone_id || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.zone_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact Number *</Label>
                    <Input 
                      id="contact" 
                      name="contact" 
                      type="tel" 
                      required 
                      defaultValue={verifiedZoneClearance?.contact || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      defaultValue={verifiedZoneClearance?.email || ""}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marital_status">Marital Status *</Label>
                  <Select name="marital_status" required defaultValue={verifiedZoneClearance?.marital_status || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select marital status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                      <SelectItem value="separated">Separated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose *</Label>
                  <Input id="purpose" name="purpose" placeholder="e.g., Medical assistance, Financial aid, School assistance" required />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Indigency;