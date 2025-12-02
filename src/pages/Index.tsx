import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Home, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";

const Index = () => {
  const documentTypes = [
    {
      title: "Zone Clearance",
      description: "Required for residency verification within your zone",
      icon: Home,
      path: "/request/zone-clearance",
      color: "bg-primary",
    },
    {
      title: "Barangay Indigency",
      description: "For financial assistance eligibility documentation",
      icon: Heart,
      path: "/request/indigency",
      color: "bg-success",
    },
    {
      title: "Barangay Clearance",
      description: "General barangay certification for various purposes",
      icon: FileText,
      path: "/request/clearance",
      color: "bg-accent",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl font-bold text-foreground">Welcome to Barangay Bayabas</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Request official barangay documents online. Select the document type you need below.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {documentTypes.map((doc) => {
            const Icon = doc.icon;
            return (
              <Card key={doc.title} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-primary">
                <CardHeader className="space-y-4">
                  <div className={`${doc.color} w-16 h-16 rounded-lg flex items-center justify-center mx-auto`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-center text-2xl">{doc.title}</CardTitle>
                  <CardDescription className="text-center text-base">
                    {doc.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full" size="lg">
                    <Link to={doc.path}>Request Document</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="outline" size="lg" asChild>
            <Link to="/track">Track My Request</Link>
          </Button>
        </div>
      </main>

      <footer className="bg-card border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Barangay Bayabas. All rights reserved.</p>
          <p className="text-sm mt-2">For assistance, contact: (123) 456-7890</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;