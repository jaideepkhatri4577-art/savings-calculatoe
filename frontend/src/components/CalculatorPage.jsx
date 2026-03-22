import React, { useState } from 'react';
import { Upload, FileText, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';

const CalculatorPage = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      // Mock processing
      console.log('File uploaded:', e.dataTransfer.files[0].name);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      console.log('File uploaded:', e.target.files[0].name);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="pt-32 pb-12 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            See how much MilkStraw AI<br />can save you
          </h1>
          <p className="text-gray-400 text-lg">
            Trusted by more than 1000 cloud engineers
          </p>
        </div>
      </div>

      {/* Calculator Section */}
      <div className="px-6 pb-20">
        <div className="container mx-auto max-w-4xl">
          {/* Tabs */}
          <div className="flex gap-0 mb-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-4 px-6 text-center transition-all relative ${
                activeTab === 'upload'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-400 border-b border-zinc-800 hover:text-gray-300'
              }`}
            >
              Upload your bill
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-4 px-6 text-center transition-all relative ${
                activeTab === 'manual'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-400 border-b border-zinc-800 hover:text-gray-300'
              }`}
            >
              Estimate manually
            </button>
          </div>

          {/* Upload Tab Content */}
          {activeTab === 'upload' && (
            <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-12">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-16 text-center transition-all ${
                  dragActive
                    ? 'border-orange-500 bg-orange-500/5'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".csv,.pdf"
                  onChange={handleFileInput}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-lg text-gray-300 mb-2">
                        {file ? (
                          <span className="text-orange-500">{file.name}</span>
                        ) : (
                          <span>
                            Drop your AWS bill here, or{' '}
                            <span className="text-orange-500 underline">browse to upload</span>
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">Supports CSV and PDF invoices</p>
                    </div>
                  </div>
                </label>
              </div>
              <div className="mt-6 flex items-start gap-2 text-sm text-gray-500">
                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Processed entirely in your browser. Your data never leaves this device.
                </p>
              </div>
            </div>
          )}

          {/* Manual Estimate Tab Content */}
          {activeTab === 'manual' && (
            <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-12">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Monthly AWS Spend (USD)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter your monthly AWS spend"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Primary AWS Services Used
                  </label>
                  <textarea
                    placeholder="e.g., EC2, S3, RDS, Lambda..."
                    rows={4}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-medium transition-colors">
                  Calculate Savings
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-6 pb-20">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-zinc-800 rounded-lg px-6 bg-zinc-950">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-medium">How accurate are these savings estimates?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 pb-6">
                Our savings estimates are based on analysis of thousands of AWS bills and typical optimization patterns. 
                The actual savings you achieve will depend on your specific infrastructure and usage patterns. 
                Most customers see savings within 10-15% of our estimates.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-zinc-800 rounded-lg px-6 bg-zinc-950">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-medium">How does MilkStraw AI actually work?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 pb-6">
                MilkStraw AI uses machine learning algorithms to analyze your AWS usage patterns and identify 
                opportunities for cost optimization. We look at resource utilization, pricing models, and industry 
                best practices to recommend specific actions you can take to reduce costs.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-zinc-800 rounded-lg px-6 bg-zinc-950">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-medium">Do you need access to my AWS account or data?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 pb-6">
                For the calculator, no. Your bill is processed entirely in your browser and never leaves your device. 
                For our full platform, we offer read-only access to help you implement optimizations, but you maintain 
                complete control over your infrastructure.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-zinc-800 rounded-lg px-6 bg-zinc-950">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-medium">What does MilkStraw AI cost?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 pb-6">
                We offer flexible pricing based on your AWS spend. Most customers pay a percentage of the savings 
                we help them achieve, so you only pay when you save. Contact us for a custom quote based on your needs.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border border-zinc-800 rounded-lg px-6 bg-zinc-950">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-medium">What if my usage changes or I need to scale?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 pb-6">
                MilkStraw AI continuously monitors your usage and adapts recommendations as your infrastructure evolves. 
                Whether you're scaling up or down, our AI adjusts to ensure you're always optimizing costs effectively.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border border-zinc-800 rounded-lg px-6 bg-zinc-950">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-medium">How long does it take to start saving?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 pb-6">
                Most customers see initial savings within the first week of implementation. Some quick wins like 
                rightsizing instances can be implemented immediately, while longer-term optimizations like reserved 
                instance planning may take a few weeks to fully realize.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Help Button */}
      <button className="fixed bottom-6 right-6 bg-white text-black rounded-full px-6 py-3 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-105">
        <HelpCircle className="w-5 h-5" />
        <span className="font-medium">Get help</span>
      </button>
    </div>
  );
};

export default CalculatorPage;