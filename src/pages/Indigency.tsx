import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";

const Indigency = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [hasZoneClearance, setHasZoneClearance] = useState<string>("");
  const [email, setEmail] = useState("");
  const [zoneClearanceVerified, setZoneClearanceVerified] = useState(false);

  useEffect(() => {
    const fetchZones = async () => {
      const { data } = await supabase.from("zones").select("*").order("zone_number");
      if (data) setZones(data);
    };
    fetchZones();
  }, []);

  const checkZoneClearance = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email to verify zone clearance.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("document_requests")
      .select("*")
      .eq("email", email)
      .eq("document_type", "zone_clearance")
      .eq("status", "approved")
      .single();

    setLoading(false);

    if (data) {
      setZoneClearanceVerified(true);
      toast({
        title: "Verified!",
        description: "Zone clearance found. You may proceed.",
      });
    } else {
      toast({
        title: "No Zone Clearance",
        description: "You need to request a zone clearance first.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (hasZoneClearance === "yes" && !zoneClearanceVerified) {
      toast({
        title: "Verification Required",
        description: "Please verify your zone clearance first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

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
      has_zone_clearance: hasZoneClearance === "yes",
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
        description: "Your indigency certificate request has been submitted.",
      });
      navigate("/");
    }
  };

  if (!hasZoneClearance) {
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
                    onClick={() => setHasZoneClearance("yes")}
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

  if (hasZoneClearance === "yes" && !zoneClearanceVerified) {
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
                Enter your email to verify your approved zone clearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="verify_email">Email Address *</Label>
                <Input
                  id="verify_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter the email used for zone clearance"
                />
              </div>

              <Button onClick={checkZoneClearance} className="w-full" size="lg" disabled={loading}>
                {loading ? (
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
                onClick={() => setHasZoneClearance("")}
              >
                Go Back
              </Button>
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
                  <Input id="contact" name="contact" type="tel" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={email} />
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
                <Input id="purpose" name="purpose" placeholder="e.g., Medical assistance, School scholarship" required />
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