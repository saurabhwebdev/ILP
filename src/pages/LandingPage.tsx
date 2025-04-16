import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  BarChart3, 
  Clock, 
  Truck, 
  Scale, 
  Users, 
  ClipboardCheck, 
  Zap,
  Warehouse
} from "lucide-react";

// Missing WarehouseFill icon, trying to import it specifically
import { Warehouse as WarehouseFill } from "lucide-react";

const LandingPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="hero-gradient text-white py-16 md:py-24">
        <div className="container mx-auto px-6 md:px-8 max-w-7xl">
          <div className="flex flex-col md:flex-row items-center md:space-x-12">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Streamline Your Logistics Operations with ILP
              </h1>
              <p className="text-lg md:text-xl mb-8 text-ilp-cream/90">
                Efficient truck management, real-time dock scheduling, and seamless weighbridge operations in one integrated platform.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link to="/signup">
                  <Button size="lg" className="bg-ilp-burgundy hover:bg-ilp-burgundy/90 text-white border-none w-full sm:w-auto">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/truck-entry">
                  <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 w-full sm:w-auto">
                    View Demo
                  </Button>
                </Link>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="rounded-lg bg-white/10 backdrop-blur-sm p-2 border border-white/20">
                <img
                  src="https://placehold.co/800x500/252f3f/ffffff?text=Logistics+Dashboard"
                  alt="Logistics Dashboard Preview"
                  className="rounded-lg shadow-2xl w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-6 md:px-8 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-ilp-navy mb-4">
              Comprehensive Logistics Management
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage trucks, docks, weighbridges and shift handovers in one place.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-xl shadow-md feature-card border border-gray-100">
              <div className="bg-ilp-navy/10 p-3 rounded-lg inline-block mb-4">
                <Truck className="h-7 w-7 text-ilp-navy" />
              </div>
              <h3 className="text-xl font-semibold text-ilp-navy mb-2">Truck Entry Management</h3>
              <p className="text-gray-600">
                Streamline truck arrivals, capture all necessary details, and manage entry gates efficiently.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-xl shadow-md feature-card border border-gray-100">
              <div className="bg-ilp-red/10 p-3 rounded-lg inline-block mb-4">
                <Warehouse className="h-7 w-7 text-ilp-red" />
              </div>
              <h3 className="text-xl font-semibold text-ilp-navy mb-2">Dock Scheduling</h3>
              <p className="text-gray-600">
                Optimize dock usage with real-time scheduling, reducing wait times and improving throughput.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-xl shadow-md feature-card border border-gray-100">
              <div className="bg-ilp-blue/10 p-3 rounded-lg inline-block mb-4">
                <Scale className="h-7 w-7 text-ilp-blue" />
              </div>
              <h3 className="text-xl font-semibold text-ilp-navy mb-2">Weighbridge Operations</h3>
              <p className="text-gray-600">
                Automate weight recording, verify load specifications, and ensure compliance with regulations.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-xl shadow-md feature-card border border-gray-100">
              <div className="bg-ilp-burgundy/10 p-3 rounded-lg inline-block mb-4">
                <Users className="h-7 w-7 text-ilp-burgundy" />
              </div>
              <h3 className="text-xl font-semibold text-ilp-navy mb-2">Transporter Collaboration</h3>
              <p className="text-gray-600">
                Coordinate with transport partners, share schedules, and improve communication across operations.
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="bg-white p-6 rounded-xl shadow-md feature-card border border-gray-100">
              <div className="bg-ilp-navy/10 p-3 rounded-lg inline-block mb-4">
                <ClipboardCheck className="h-7 w-7 text-ilp-navy" />
              </div>
              <h3 className="text-xl font-semibold text-ilp-navy mb-2">Shift Handover</h3>
              <p className="text-gray-600">
                Seamless transition between shifts with comprehensive handover documentation and task tracking.
              </p>
            </div>
            
            {/* Feature 6 */}
            <div className="bg-white p-6 rounded-xl shadow-md feature-card border border-gray-100">
              <div className="bg-ilp-blue/10 p-3 rounded-lg inline-block mb-4">
                <BarChart3 className="h-7 w-7 text-ilp-blue" />
              </div>
              <h3 className="text-xl font-semibold text-ilp-navy mb-2">Real-Time Analytics</h3>
              <p className="text-gray-600">
                Monitor key metrics, track performance indicators, and optimize your logistics operations.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="container mx-auto px-6 md:px-8 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-ilp-navy mb-4">
              Trusted by Transportation Leaders
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              See what logistics companies are saying about ILP's transportation management platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="mr-4">
                  <img
                    src="https://placehold.co/100x100/252f3f/ffffff?text=MH"
                    alt="Mark Henderson"
                    className="h-12 w-12 rounded-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-lg font-semibold">Mark Henderson</h4>
                  <p className="text-sm text-gray-500">Logistics Manager, FastFreight Co.</p>
                </div>
              </div>
              <p className="text-gray-700">
                "ILP has revolutionized our dock operations. We've cut loading times by 40% and significantly reduced driver wait times."
              </p>
            </div>
            
            {/* Testimonial 2 */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="mr-4">
                  <img
                    src="https://placehold.co/100x100/252f3f/ffffff?text=JD"
                    alt="Jessica Daniels"
                    className="h-12 w-12 rounded-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-lg font-semibold">Jessica Daniels</h4>
                  <p className="text-sm text-gray-500">Operations Director, Global Logistics</p>
                </div>
              </div>
              <p className="text-gray-700">
                "The shift handover feature has eliminated communication gaps between our teams. Nothing falls through the cracks anymore."
              </p>
            </div>
            
            {/* Testimonial 3 */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="mr-4">
                  <img
                    src="https://placehold.co/100x100/252f3f/ffffff?text=RT"
                    alt="Raj Patel"
                    className="h-12 w-12 rounded-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-lg font-semibold">Raj Patel</h4>
                  <p className="text-sm text-gray-500">Fleet Manager, TransportNow Inc.</p>
                </div>
              </div>
              <p className="text-gray-700">
                "Our weighbridge processes used to take 20 minutes per truck. With ILP, we've cut that down to just 5 minutes while improving accuracy."
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="bg-ilp-navy text-white py-16">
        <div className="container mx-auto px-6 md:px-8 max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Optimize Your Logistics Operations?
            </h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto text-ilp-cream/90">
              Join leading transportation companies using ILP to streamline operations and boost efficiency.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link to="/signup">
                <Button size="lg" className="bg-ilp-burgundy hover:bg-ilp-burgundy/90 text-white w-full sm:w-auto">
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 w-full sm:w-auto">
                  Request Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
