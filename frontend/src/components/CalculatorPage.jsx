import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Download } from 'lucide-react';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CalculatorPage = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [showResults, setShowResults] = useState(false);
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
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      processFile(droppedFile);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = async (uploadedFile) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await fetch(`${API}/calculate-savings`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process file');
      }

      const data = await response.json();
      setResultsData(data);
      setIsProcessing(false);
      setShowResults(true);
    } catch (error) {
      console.error('Error processing file:', error);
      setIsProcessing(false);
      alert('Error processing file. Please try again.');
    }
  };

  const downloadExcel = () => {
    if (!resultsData) return;

    const breakdown = resultsData.breakdown || [];
    
    // Create CSV content
    let csvContent = "AWS Savings Calculator Results\n\n";
    csvContent += "Summary\n";
    csvContent += `Current Spend,$${resultsData.current_spend?.toLocaleString() || 0}/month\n`;
    csvContent += `Monthly Savings,$${resultsData.monthly_savings?.toLocaleString() || 0}\n`;
    csvContent += `Annual Savings,$${resultsData.annual_savings?.toLocaleString() || 0}\n`;
    csvContent += `Reduction,${resultsData.savings_percentage?.toFixed(1) || 0}%\n\n`;
    
    csvContent += "Service Breakdown\n";
    csvContent += "Service,Original Cost,Optimized Cost,Savings,Savings %,Coverage,Commitment Type\n";
    
    breakdown.forEach(item => {
      const originalCost = item.original_cost || item.on_demand_cost || 0;
      const savingsPct = item.savings_percentage || ((item.savings / originalCost) * 100) || 0;
      csvContent += `${item.service},$${originalCost.toFixed(2)},$${item.optimized_cost.toFixed(2)},$${item.savings.toFixed(2)},${savingsPct.toFixed(1)}%,${item.coverage},${item.commitment_type || 'N/A'}\n`;
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

  const resetCalculator = () => {
    setShowResults(false);
    setFile(null);
    setResultsData(null);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      {!showResults ? (
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

          {/* Upload Tab */}
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
                  disabled={isProcessing}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                      {isProcessing ? (
                        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-lg text-gray-300 mb-2">
                        {isProcessing ? (
                          <span className="text-orange-500">Processing your bill...</span>
                        ) : file ? (
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
                <p>Processed entirely in your browser. Your data never leaves this device.</p>
              </div>
            </div>
          )}

          {/* Manual Tab - Placeholder */}
          {activeTab === 'manual' && (
            <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-12">
              <p className="text-center text-gray-400">Manual estimation coming soon. Please use file upload.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-6xl py-12">
          {/* Results Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 mb-6">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-500 font-medium">Analysis Complete</span>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Total Bill</h3>
                <div className="text-3xl font-bold text-white">
                  ${resultsData?.current_spend?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
                </div>
                <p className="text-xs text-gray-500 mt-2">Current monthly spend</p>
              </div>
              
              <div className="bg-zinc-950 border border-green-500/30 rounded-lg p-6">
                <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Projected Cost</h3>
                <div className="text-3xl font-bold text-green-500">
                  ${resultsData?.optimized_spend?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
                </div>
                <p className="text-xs text-green-400 mt-2">↓ {resultsData?.savings_percentage || 0}% with RI/SP</p>
              </div>
              
              <div className="bg-zinc-950 border border-orange-500/30 rounded-lg p-6">
                <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Monthly Savings</h3>
                <div className="text-3xl font-bold text-orange-500">
                  ${resultsData?.monthly_savings?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
                </div>
                <p className="text-xs text-gray-500 mt-2">Per month</p>
              </div>
              
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-sm text-orange-400 mb-2 uppercase tracking-wide">Annual Savings</h3>
                <div className="text-3xl font-bold text-orange-400">
                  ${resultsData?.annual_savings?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
                </div>
                <p className="text-xs text-gray-500 mt-2">Per year</p>
              </div>
            </div>
            
            {/* Projection Details Banner */}
            <div className="bg-gradient-to-r from-green-500/10 to-orange-500/10 border border-green-500/20 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">💡 Savings Projection with AWS RI & Savings Plans</h3>
                  <p className="text-gray-400 text-sm">
                    By applying Reserved Instances and Savings Plans across your services, you can reduce your monthly AWS bill from{' '}
                    <span className="text-white font-semibold">${resultsData?.current_spend?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    {' '}to{' '}
                    <span className="text-green-400 font-semibold">${resultsData?.optimized_spend?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    {' '}— saving{' '}
                    <span className="text-orange-400 font-semibold">${resultsData?.monthly_savings?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month</span>
                    {' '}({resultsData?.savings_percentage}% reduction).
                  </p>
                </div>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4">You could save</h1>
            <div className="flex items-center justify-center gap-2 text-lg mb-4">
              <span className="text-orange-500 font-semibold">
                {resultsData?.savings_percentage?.toFixed(1) || 0}% reduction
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
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Projected Cost</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Savings</th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-gray-400">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsData?.breakdown?.map((item, index) => {
                    const originalCost = item.original_cost || item.on_demand_cost;
                    const savingsPct = item.savings_percentage || ((item.savings / originalCost) * 100);
                    
                    return (
                      <tr key={index} className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-white font-medium">{item.service}</span>
                            {item.reserved_portion > 0 && (
                              <span className="text-xs text-blue-400 mt-1">
                                ${item.reserved_portion.toLocaleString()} covered by RI/SP
                              </span>
                            )}
                            {item.usage_hours && item.usage_hours < 730 && (
                              <span className="text-xs text-yellow-500 mt-1">
                                ⚠ {item.usage_hours}h/month usage
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-gray-300 font-medium">
                              ${originalCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            {(item.compute_cost || item.storage_cost || item.coverage_percentage > 0) && (
                              <span className="text-xs text-gray-500 mt-1">
                                (
                                {item.compute_cost && item.storage_cost ? (
                                  <>
                                    ${item.compute_cost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} compute + 
                                    ${item.storage_cost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {item.storage_label || 'storage'}
                                    {item.coverage_percentage >= 0 && (
                                      <>, {item.coverage_percentage.toFixed(0)}% {item.coverage_percentage >= 90 ? 'SP' : 'RI/SP'} coverage</>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    ${originalCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    {item.coverage_percentage > 0 && (
                                      <>, {item.coverage_percentage.toFixed(0)}% {item.coverage_percentage >= 90 ? 'SP' : 'RI/SP'} coverage</>
                                    )}
                                  </>
                                )}
                                )
                              </span>
                            )}
                            {/* Show Linux/RHEL breakdown for EC2 */}
                            {item.service === 'Compute (EC2)' && (item.linux_cost || item.rhel_cost) && (
                              <span className="text-xs text-blue-400 mt-1">
                                Linux: ${item.linux_cost?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}, 
                                RHEL: ${item.rhel_cost?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-white font-medium">
                          ${item.optimized_cost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-green-500 font-semibold text-lg">
                              -${item.savings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-sm text-green-400 font-medium">
                              ({savingsPct.toFixed(1)}% savings)
                            </span>
                            {item.commitment_type && item.commitment_type !== 'N/A' && item.savings > 0 && (
                              <span className="text-xs text-gray-500 mt-1">
                                via {item.commitment_type}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                            item.coverage_percentage >= 90 
                              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' 
                              : item.coverage_percentage > 0
                              ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                              : 'bg-green-500/10 border border-green-500/20 text-green-500'
                          }`}>
                            <CheckCircle className="w-3 h-3" />
                            {item.coverage}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
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
                onClick={resetCalculator}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Calculate Again
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculatorPage;
