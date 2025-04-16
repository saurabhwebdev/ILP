
import { Link } from "react-router-dom";
import { 
  ChevronRight, 
  Mail, 
  MapPin, 
  Phone,
  Linkedin,
  Twitter,
  Facebook,
  Instagram
} from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-ilp-navy text-white pt-12 pb-6">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">ILP</h3>
            <p className="text-gray-300 mb-4">
              Empowering businesses with innovative solutions to streamline operations and boost productivity.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-white hover:text-ilp-blue transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-white hover:text-ilp-blue transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-white hover:text-ilp-blue transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-white hover:text-ilp-blue transition-colors">
                <Instagram size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white flex items-center">
                  <ChevronRight size={16} className="mr-1" />
                  <span>Home</span>
                </Link>
              </li>
              <li>
                <Link to="/features" className="text-gray-300 hover:text-white flex items-center">
                  <ChevronRight size={16} className="mr-1" />
                  <span>Features</span>
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-gray-300 hover:text-white flex items-center">
                  <ChevronRight size={16} className="mr-1" />
                  <span>Pricing</span>
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-300 hover:text-white flex items-center">
                  <ChevronRight size={16} className="mr-1" />
                  <span>Login</span>
                </Link>
              </li>
              <li>
                <Link to="/signup" className="text-gray-300 hover:text-white flex items-center">
                  <ChevronRight size={16} className="mr-1" />
                  <span>Sign Up</span>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-300 hover:text-white flex items-center">
                  <ChevronRight size={16} className="mr-1" />
                  <span>Data Analytics</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white flex items-center">
                  <ChevronRight size={16} className="mr-1" />
                  <span>Business Intelligence</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white flex items-center">
                  <ChevronRight size={16} className="mr-1" />
                  <span>Workflow Automation</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white flex items-center">
                  <ChevronRight size={16} className="mr-1" />
                  <span>Integration Services</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white flex items-center">
                  <ChevronRight size={16} className="mr-1" />
                  <span>Consulting</span>
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin size={20} className="mr-2 mt-1 flex-shrink-0" />
                <span>123 Business Avenue, Suite 500, San Francisco, CA 94107</span>
              </li>
              <li className="flex items-center">
                <Phone size={20} className="mr-2 flex-shrink-0" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center">
                <Mail size={20} className="mr-2 flex-shrink-0" />
                <span>contact@ilp-saas.com</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} ILP. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 space-x-4 text-sm text-gray-400">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <span>|</span>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <span>|</span>
              <a href="#" className="hover:text-white">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
