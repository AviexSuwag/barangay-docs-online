import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Upload, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Clearance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [hasZoneClearance, setHasZoneClearance] = useState<string>("no");
  const [zoneClearanceVerified, setZoneClearanceVerified] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchZones = async () => {
      const { data } = await supabase.from("zones").select("*").order("zone_number");
      if (data) setZones(data);
    };
    fetchZones();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleVerifyZoneClearance = async () => {
    const email = (document.getElementById("verify_email") as HTMLInputElement)?.value;
    const phone = (document.getElementById("verify_phone") as HTMLInputElement)?.value;

    if (!email && !phone) {
      toast({
        title: "Verification Required",
        description: "Please enter either your email or phone number to verify your Zone Clearance.",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);

    // Search for approved zone clearance by email or phone
    let query = supabase
      .from("document_requests")
      .select("*")
      .eq("document_type", "zone_clearance")
      .eq("status", "approved");

    if (email) {
      query = query.eq("email", email);
    } else if (phone) {
      query = query.eq("contact", phone);
    }

    const { data, error } = await query;

    setVerifying(false);

    if (error || !data || data.length === 0) {
      toast({
        title: "Not Found",
        description: "No approved Zone Clearance found with the provided information. Please request a Zone Clearance first.",
        variant: "destructive",
      });
      return;
    }

    setZoneClearanceVerified(true);
    toast({
      title: "Verified!",
      description: "Your Zone Clearance has been verified successfully.",
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if they have zone clearance
    if (hasZoneClearance === "no") {
      toast({
        title: "Zone Clearance Required",
        description: "You must have a valid Zone Clearance before requesting a Barangay Clearance. Please request a Zone Clearance first.",
        variant: "destructive",
      });
      return;
    }

    // Check if zone clearance is verified (only if they claim to have one)
    if (hasZoneClearance === "yes" && !zoneClearanceVerified && !uploadedFile) {
      toast({
        title: "Verification Required",
        description: "Please verify your Zone Clearance or upload a copy before proceeding.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    let fileUrl = null;
    
    // If they uploaded a file, upload it to storage
    if (uploadedFile) {
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('zone-clearances')
        .upload(filePath, uploadedFile);

      if (uploadError) {
        toast({
          title: "Error",
          description: "Failed to upload file. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      fileUrl = filePath;
    }

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
      document_type: "clearance" as const,
      purpose: formData.get("purpose") as string,
      has_zone_clearance: true,
      zone_clearance_file_url: fileUrl,
    };

    const { error } = await supabase.from("document_requests").insert([data]);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success!",
        description: "Your barangay clearance request has been submitted.",
      });
      navigate("/");
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
            <CardTitle className="text-3xl">Barangay Clearance Request</CardTitle>
            <CardDescription>
              Fill out the form below to request a barangay clearance certificate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> A valid Zone Clearance is required before you can request a Barangay Clearance.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Zone Clearance Verification Section */}
              <div className="space-y-4 p-4 border-2 rounded-lg bg-muted/20">
                <Label className="text-lg font-semibold">Zone Clearance Verification</Label>
                <p className="text-sm text-muted-foreground">
                  Do you already have an approved Zone Clearance?
                </p>
                
                <Select value={hasZoneClearance} onValueChange={setHasZoneClearance} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes, I have an approved Zone Clearance</SelectItem>
                    <SelectItem value="no">No, I need to request one first</SelectItem>
                  </SelectContent>
                </Select>

                {hasZoneClearance === "no" && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You must first request and get approval for a Zone Clearance before applying for a Barangay Clearance.
                      <Button variant="link" asChild className="p-0 h-auto ml-1">
                        <Link to="/request/zone-clearance">Request Zone Clearance here</Link>
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {hasZoneClearance === "yes" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Verify your Zone Clearance</Label>
                      <p className="text-xs text-muted-foreground">
                        Enter your email OR phone number that you used when requesting your Zone Clearance:
                      </p>
                      <div className="grid gap-2">
                        <Input
                          id="verify_email"
                          type="email"
                          placeholder="Email address"
                        />
                        <p className="text-center text-xs text-muted-foreground">OR</p>
                        <Input
                          id="verify_phone"
                          type="tel"
                          placeholder="Phone number"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleVerifyZoneClearance}
                        disabled={verifying || zoneClearanceVerified}
                        className="w-full"
                      >
                        {verifying ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : zoneClearanceVerified ? (
                          "✓ Verified"
                        ) : (
                          "Verify Zone Clearance"
                        )}
                      </Button>
                    </div>

                    {!zoneClearanceVerified && (
                      <>
                        <p className="text-center text-sm text-muted-foreground">OR</p>
                        <div className="space-y-2">
                          <Label htmlFor="clearance_file">Upload Your Zone Clearance Document</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="clearance_file"
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={handleFileChange}
                              className="cursor-pointer"
                            />
                            <Upload className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Accepted formats: PDF, JPG, PNG
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

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
                  <Input id="contact" name="contact" type="tel" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
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
                <Input id="purpose" name="purpose" placeholder="e.g., Employment, Business permit, Loan application" required />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading || hasZoneClearance === "no"}>
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

export default Clearance;