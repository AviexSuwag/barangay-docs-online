import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { getZones, createDocumentRequest, saveFile, getApprovedZoneClearance } from "@/lib/offlineDb";
import { ArrowLeft, Loader2, AlertCircle, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";

const Indigency = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [hasZoneClearance, setHasZoneClearance] = useState<string>("");
  const [verifyMethod, setVerifyMethod] = useState<"email" | "phone" | "">("");
  const [verifyValue, setVerifyValue] = useState("");
  const [zoneClearanceVerified, setZoneClearanceVerified] = useState(false);
  const [zoneClearanceFile, setZoneClearanceFile] = useState<File | null>(null);
  const [step, setStep] = useState<"initial" | "verify-method" | "verify-input" | "upload-clearance" | "form">("initial");

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

  const checkZoneClearance = async () => {
    if (!verifyValue) {
      toast({
        title: verifyMethod === "email" ? "Email Required" : "Phone Required",
        description: `Please enter your ${verifyMethod} to verify zone clearance.`,
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    
    const data = await getApprovedZoneClearance(
      verifyMethod === "email" ? verifyValue : undefined,
      verifyMethod === "phone" ? verifyValue : undefined
    );

    setVerifying(false);

    if (data) {
      setZoneClearanceVerified(true);
      toast({
        title: "Verified!",
        description: "Zone clearance found. Please upload a picture of your zone clearance.",
      });
      setStep("upload-clearance");
    } else {
      toast({
        title: "No Zone Clearance Found",
        description: `No approved zone clearance found with this ${verifyMethod}. Please request a zone clearance first.`,
        variant: "destructive",
      });
    }
  };

  const handleClearanceUpload = () => {
    if (!zoneClearanceFile) {
      toast({
        title: "File Required",
        description: "Please upload a picture of your zone clearance.",
        variant: "destructive",
      });
      return;
    }
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!zoneClearanceVerified || !zoneClearanceFile) {
      toast({
        title: "Verification Required",
        description: "Please verify your zone clearance and upload the document first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Save the zone clearance file locally
    const fileName = await saveFile(zoneClearanceFile);

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
      zone_clearance_file_url: fileName,
    };

    try {
      await createDocumentRequest(data);
      toast({
        title: "Success!",
        description: "Your indigency certificate request has been submitted. You will receive a reference number once approved.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  // Step 1: Initial question
  if (step === "initial") {
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
                Before proceeding, we need to verify if you have a zone clearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A zone clearance is required before requesting an indigency certificate.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Label>Do you have an approved Zone Clearance?</Label>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setHasZoneClearance("yes");
                      setStep("verify-method");
                    }}
                  >
                    Yes, I have one
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate("/request/zone-clearance")}
                  >
                    No, request one first
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Step 2: Choose verification method (email or phone)
  if (step === "verify-method") {
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
              <CardTitle className="text-3xl">Verify Zone Clearance</CardTitle>
              <CardDescription>
                How would you like to verify your zone clearance?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Choose verification method:</Label>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setVerifyMethod("email");
                      setStep("verify-input");
                    }}
                  >
                    Verify by Email
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setVerifyMethod("phone");
                      setStep("verify-input");
                    }}
                  >
                    Verify by Phone
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep("initial")}
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Step 3: Enter email or phone for verification
  if (step === "verify-input") {
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
              <CardTitle className="text-3xl">Verify Zone Clearance</CardTitle>
              <CardDescription>
                Enter your {verifyMethod === "email" ? "email address" : "phone number"} to verify your approved zone clearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="verify_input">
                  {verifyMethod === "email" ? "Email Address" : "Phone Number"} *
                </Label>
                <Input
                  id="verify_input"
                  type={verifyMethod === "email" ? "email" : "tel"}
                  value={verifyValue}
                  onChange={(e) => setVerifyValue(e.target.value)}
                  placeholder={verifyMethod === "email" ? "Enter your email" : "Enter your phone number"}
                />
              </div>

              <Button onClick={checkZoneClearance} className="w-full" size="lg" disabled={verifying}>
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Zone Clearance"
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep("verify-method")}
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Step 4: Upload zone clearance picture
  if (step === "upload-clearance") {
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
              <CardTitle className="text-3xl">Upload Zone Clearance</CardTitle>
              <CardDescription>
                Please upload a picture of your zone clearance document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-green-50 border-green-200">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Zone clearance verified successfully!
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="zone_clearance_file">Upload Zone Clearance Picture *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="zone_clearance_file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleZoneClearanceFileChange}
                    required
                    className="cursor-pointer"
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Accepted formats: PDF, JPG, PNG. Take a clear photo of your zone clearance.
                </p>
              </div>

              <Button onClick={handleClearanceUpload} className="w-full" size="lg">
                Continue to Form
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep("verify-input")}
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Step 5: Main form
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
            <Alert className="mb-6 bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Zone clearance verified and uploaded successfully!
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" name="first_name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middle_name">Middle Name</Label>
                  <Input id="middle_name" name="middle_name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input id="last_name" name="last_name" required />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input id="age" name="age" type="number" min="1" max="150" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Birth Date *</Label>
                  <Input id="birth_date" name="birth_date" type="date" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Complete Address *</Label>
                <Input id="address" name="address" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone_id">Zone *</Label>
                <Select name="zone_id" required>
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
                    defaultValue={verifyMethod === "phone" ? verifyValue : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email"
                    defaultValue={verifyMethod === "email" ? verifyValue : ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marital_status">Marital Status *</Label>
                <Select name="marital_status" required>
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
                <Input id="purpose" name="purpose" placeholder="e.g., Financial assistance, Medical assistance" required />
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Indigency;
