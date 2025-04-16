import { Heart, Github } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-3 items-center">
          {/* Column 1 - GitHub */}
          <div className="flex justify-start">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Github size={20} />
            </a>
          </div>
          
          {/* Column 2 - Made with love */}
          <div className="flex justify-center">
            <p className="text-gray-600 text-sm flex items-center">
              Made with <Heart size={16} className="mx-1 text-ilp-red fill-ilp-red" />
            </p>
          </div>
          
          {/* Column 3 - Copyright */}
          <div className="flex justify-end">
            <p className="text-gray-600 text-sm">
              &copy; {currentYear} ILP
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
