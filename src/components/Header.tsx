import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="bg-primary-foreground/10 p-3 rounded-lg">
            <FileText className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Barangay Bayabas</h1>
            <p className="text-sm text-primary-foreground/80">Document Request System</p>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Header;