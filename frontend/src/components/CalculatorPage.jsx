import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, TrendingDown, Download } from 'lucide-react';
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
  const [showResults, setShowResults] = useState(false);
  const [monthlySpend, setMonthlySpend] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [hasReservedInstances, setHasReservedInstances] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultsData, setResultsData] = useState(null);

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
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      console.log('File uploaded:', selectedFile.name);
      // Process the file
      processFile(selectedFile);
    }
  };

  const processFile = async (uploadedFile) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/calculate-savings`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process file');
      }

      const data = await response.json();
      console.log('Processing result:', data);
      
      setResultsData(data);
      setIsProcessing(false);
      setShowResults(true);
    } catch (error) {
      console.error('Error processing file:', error);
      setIsProcessing(false);
      alert('Error processing file. Please try again or use manual estimate.');
    }
  };

  const toggleService = (service) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter(s => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleCalculateSavings = () => {
    if (monthlySpend || selectedServices.length > 0) {
      // Use mock calculation for manual estimate
      const mockData = {
        current_spend: parseFloat(monthlySpend) || 10000,
        monthly_savings: 0,
        annual_savings: 0,
        savings_percentage: 0,
        breakdown: calculateSavings(),
        has_reserved_instances: hasReservedInstances === 'yes'
      };
      
      // Calculate totals from breakdown
      mockData.monthly_savings = mockData.breakdown.reduce((acc, item) => acc + item.savings, 0);
      mockData.annual_savings = mockData.monthly_savings * 12;
      mockData.savings_percentage = (mockData.monthly_savings / mockData.current_spend) * 100;
      
      setResultsData(mockData);
      setShowResults(true);
    }
  };

  const downloadExcel = () => {
    const breakdown = getBreakdownData();
    const totals = getTotalSavings();
    
    // Create CSV content
    let csvContent = "AWS Savings Calculator Results\n\n";
    csvContent += "Summary\n";
    csvContent += `Current Spend,$${totals.monthly.toLocaleString()}/month\n`;
    csvContent += `Monthly Savings,$${totals.monthly.toLocaleString()}\n`;
    csvContent += `Annual Savings,$${totals.annual.toLocaleString()}\n`;
    csvContent += `Reduction,${totals.percentage.toFixed(1)}%\n\n`;
    
    csvContent += "Service Breakdown\n";
    csvContent += "Service,Original Cost,Optimized Cost,Savings,Savings %,Coverage,Commitment Type\n";
    
    breakdown.forEach(item => {
      const savingsPct = item.savingsPercentage || ((item.savings / (item.originalCost || item.onDemand)) * 100);
      csvContent += `${item.service},$${(item.originalCost || item.onDemand).toFixed(2)},$${item.optimized.toFixed(2)},$${item.savings.toFixed(2)},${savingsPct.toFixed(1)}%,${item.coverage},${item.commitmentType || 'N/A'}\n`;
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'aws-savings-analysis.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateSavings = () => {
    const spend = parseFloat(monthlySpend) || 10000;
    const services = selectedServices.length > 0 ? selectedServices : ['EC2', 'Lambda', 'RDS'];
    
    const savingsData = {
      'EC2': { discount: 0.56, label: 'Compute' },
      'Lambda': { discount: 0.12, label: 'Lambda' },
      'RDS': { discount: 0.35, label: 'RDS' },
      'ECS': { discount: 0.45, label: 'ECS' },
      'Fargate': { discount: 0.40, label: 'Fargate' },
      'ElastiCache': { discount: 0.35, label: 'ElastiCache' },
      'OpenSearch': { discount: 0.35, label: 'OpenSearch' },
      'Redshift': { discount: 0.38, label: 'Redshift' },
    };

    const serviceSpend = spend / services.length;
    
    return services.map(service => {
      const data = savingsData[service] || { discount: 0.30, label: service };
      const onDemand = serviceSpend;
      const optimized = onDemand * (1 - data.discount);
      const savings = onDemand - optimized;
      
      return {
        service: data.label,
        onDemand: onDemand,
        optimized: optimized,
        savings: savings,
        discount: data.discount * 100,
      };
    });
  };

  const getTotalSavings = () => {
    if (resultsData) {
      return {
        total: resultsData.monthly_savings,
        percentage: resultsData.savings_percentage,
        monthly: resultsData.monthly_savings,
        annual: resultsData.annual_savings,
      };
    }
    
    // Fallback for old calculation method
    const breakdown = calculateSavings();
    const totalSavings = breakdown.reduce((acc, item) => acc + item.savings, 0);
    const totalOnDemand = breakdown.reduce((acc, item) => acc + item.onDemand, 0);
    return {
      total: totalSavings,
      percentage: (totalSavings / totalOnDemand) * 100,
      monthly: totalSavings,
      annual: totalSavings * 12,
    };
  };

  const getBreakdownData = () => {
    if (resultsData && resultsData.breakdown) {
      return resultsData.breakdown.map(item => ({
        service: item.service,
        originalCost: item.original_cost || item.on_demand_cost,
        onDemand: item.on_demand_cost,
        optimized: item.optimized_cost,
        savings: item.savings,
        savingsPercentage: item.savings_percentage || ((item.savings / (item.original_cost || item.on_demand_cost)) * 100),
        discount: item.discount_percentage,
        coverage: item.coverage || 'On-demand',
        coveragePercentage: item.coverage_percentage || 0,
        reservedPortion: item.reserved_portion || 0,
        onDemandPortion: item.on_demand_portion || 0,
        commitmentType: item.commitment_type || 'N/A',
        usageHours: item.usage_hours || null
      }));
    }
    return calculateSavings();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {!showResults ? (
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="w-full max-w-4xl">
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
              <div className="space-y-8">
                {/* Question 1: Services */}
                <div>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold">1</span>
                    </div>
                    <label className="text-base font-medium text-white">
                      Which services do you use?
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3 ml-9">
                    {['EC2', 'Lambda', 'Fargate', 'ECS', 'RDS', 'ElastiCache', 'OpenSearch', 'Redshift'].map(service => (
                      <button
                        key={service}
                        onClick={() => toggleService(service)}
                        className={`px-4 py-2 rounded-lg border transition-all ${
                          selectedServices.includes(service)
                            ? 'bg-orange-600 border-orange-600 text-white'
                            : 'bg-zinc-900 border-zinc-700 text-gray-300 hover:border-zinc-600'
                        }`}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question 2: Reserved Instances */}
                <div>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold">2</span>
                    </div>
                    <label className="text-base font-medium text-white">
                      Do you have Reserved Instances or Savings Plans?
                    </label>
                  </div>
                  <div className="flex gap-3 ml-9">
                    {[
                      { value: 'yes', label: 'Yes' },
                      { value: 'no', label: 'No' },
                      { value: 'not-sure', label: 'Not sure' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setHasReservedInstances(option.value)}
                        className={`px-4 py-2 rounded-lg border transition-all ${
                          hasReservedInstances === option.value
                            ? 'bg-orange-600 border-orange-600 text-white'
                            : 'bg-zinc-900 border-zinc-700 text-gray-300 hover:border-zinc-600'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monthly Spend (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Monthly AWS Spend (USD) - Optional
                  </label>
                  <input
                    type="number"
                    value={monthlySpend}
                    onChange={(e) => setMonthlySpend(e.target.value)}
                    placeholder="e.g., 10000"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>

                <Button 
                  onClick={handleCalculateSavings}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
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
        </>
      ) : (
        <>
          {/* Results View */}
          <div className="pt-32 pb-12 px-6">
            <div className="container mx-auto max-w-5xl">
              {/* Results Header */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 mb-6">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-500 font-medium">Analysis Complete</span>
                </div>
                
                {/* Show current spend card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
                    <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Current Spend</h3>
                    <div className="text-3xl font-bold text-white">
                      ${resultsData?.current_spend?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || getTotalSavings().monthly.toLocaleString('en-US')}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">On-demand pricing</p>
                  </div>
                  
                  <div className="bg-zinc-950 border border-orange-500/30 rounded-lg p-6">
                    <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Monthly Savings</h3>
                    <div className="text-3xl font-bold text-orange-500">
                      ${getTotalSavings().monthly.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Potential reduction</p>
                  </div>
                  
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
                    <h3 className="text-sm text-orange-400 mb-2 uppercase tracking-wide">Annual Savings</h3>
                    <div className="text-3xl font-bold text-orange-400">
                      ${getTotalSavings().annual.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Per year</p>
                  </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  You could save
                </h1>
                <div className="flex items-center justify-center gap-2 text-lg mb-4">
                  <TrendingDown className="w-5 h-5 text-orange-500" />
                  <span className="text-orange-500 font-semibold">
                    {getTotalSavings().percentage.toFixed(1)}% reduction
                  </span>
                  <span className="text-gray-400">in AWS costs</span>
                </div>
                
                {resultsData?.has_reserved_instances && (
                  <div className="bg-orange-900/20 border border-orange-700/40 rounded-lg px-6 py-3 inline-block mt-4">
                    <p className="text-sm text-orange-300">
                      ✓ We detected existing Reserved Instances or Savings Plans and calculated savings only on on-demand resources.
                    </p>
                  </div>
                )}
              </div>

              {/* Savings Breakdown Table */}
              <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-zinc-800">
                  <h2 className="text-xl font-semibold">Savings Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Service</th>
                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Original Cost</th>
                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Optimized Cost</th>
                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Savings</th>
                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-400">Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getBreakdownData().map((item, index) => (
                        <tr key={index} className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-white font-medium">{item.service}</span>
                              {item.reservedPortion > 0 && (
                                <span className="text-xs text-blue-400 mt-1">
                                  ${item.reservedPortion.toLocaleString()} covered by RI/SP
                                </span>
                              )}
                              {item.usageHours && item.usageHours < 730 && (
                                <span className="text-xs text-yellow-500 mt-1">
                                  ⚠ {item.usageHours}h/month usage (not 24/7)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-gray-300 font-medium">
                                ${(item.originalCost || item.onDemand).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                              {item.reservedPortion > 0 && (
                                <span className="text-xs text-gray-500 mt-1">
                                  (${item.onDemandPortion.toLocaleString()} compute)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-white font-medium">
                            ${item.optimized.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-green-500 font-semibold text-lg">
                                -${item.savings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                              <span className="text-sm text-green-400 font-medium">
                                ({(item.savingsPercentage || ((item.savings / (item.originalCost || item.onDemand)) * 100)).toFixed(1)}% savings)
                              </span>
                              {item.commitmentType && item.commitmentType !== 'N/A' && item.savings > 0 && (
                                <span className="text-xs text-gray-500 mt-1">
                                  via {item.commitmentType}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                              item.coveragePercentage >= 90 
                                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' 
                                : item.coveragePercentage > 0
                                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                                : 'bg-green-500/10 border border-green-500/20 text-green-500'
                            }`}>
                              <CheckCircle className="w-3 h-3" />
                              {item.coverage}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CTA Section */}
              <div className="text-center">
                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={downloadExcel}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download Excel Report
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowResults(false);
                      setFile(null);
                      setResultsData(null);
                      setMonthlySpend('');
                      setSelectedServices([]);
                      setHasReservedInstances(null);
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                  >
                    Calculate Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculatorPage;