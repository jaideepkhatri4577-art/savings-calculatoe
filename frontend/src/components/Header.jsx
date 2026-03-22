import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from './ui/button';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-900">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-white font-semibold text-lg">
            <Lock className="w-5 h-5" />
            <span>MILKSTRAW</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/pricing" className="text-gray-300 hover:text-white transition-colors text-sm">
              Pricing
            </Link>
            <Link to="/calculator" className="text-white transition-colors text-sm font-medium">
              Calculator
            </Link>
            <Link to="/customers" className="text-gray-300 hover:text-white transition-colors text-sm">
              Customers
            </Link>
            <div className="relative group">
              <button className="text-gray-300 hover:text-white transition-colors text-sm">
                Resources
              </button>
            </div>
            <Link to="/docs" className="text-gray-300 hover:text-white transition-colors text-sm">
              Docs
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            <button className="text-gray-300 hover:text-white transition-colors text-sm">
              Sign in
            </button>
            <button className="text-gray-300 hover:text-white transition-colors text-sm hidden lg:block">
              Book a demo
            </button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;