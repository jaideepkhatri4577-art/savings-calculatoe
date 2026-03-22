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
          <div className="flex gap-0 mb-10 bg-zinc-900/50 rounded-xl p-1 border border-zinc-800">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-4 px-6 text-center transition-all rounded-lg font-semibold text-base ${
                activeTab === 'upload'
                  ? 'text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-zinc-800/50'
              }`}
            >
              Upload your bill
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-4 px-6 text-center transition-all rounded-lg font-semibold text-base ${
                activeTab === 'manual'
                  ? 'text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-zinc-800/50'
              }`}
            >
              Estimate manually
            </button>
          </div>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl border border-zinc-700 p-12 shadow-2xl">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-20 text-center transition-all ${
                  dragActive
                    ? 'border-orange-500 bg-gradient-to-br from-orange-500/10 to-amber-500/10 shadow-lg shadow-orange-500/20'
                    : 'border-zinc-600 hover:border-zinc-500 hover:bg-zinc-900/30'
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
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center shadow-xl border border-zinc-700">
                      {isProcessing ? (
                        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-10 h-10 text-orange-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-lg text-gray-200 mb-3 font-medium">
                        {isProcessing ? (
                          <span className="text-orange-400 text-xl font-semibold">Processing your bill...</span>
                        ) : file ? (
                          <span className="text-orange-400 text-xl font-semibold">{file.name}</span>
                        ) : (
                          <span>
                            Drop your AWS bill here, or{' '}
                            <span className="text-orange-400 underline underline-offset-4 font-semibold">browse to upload</span>
                          </span>
                        )}
                      </p>
                      <p className="text-base text-gray-400">Supports CSV and PDF invoices</p>
                    </div>
                  </div>
                </label>
              </div>
              <div className="mt-8 flex items-start gap-3 text-base text-gray-400 bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <FileText className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-400" />
                <p>Processed entirely in your browser. Your data never leaves this device.</p>
              </div>
            </div>
          )}

          {/* Manual Tab - Placeholder */}
          {activeTab === 'manual' && (
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl border border-zinc-700 p-12 shadow-2xl">
              <p className="text-center text-gray-400 text-lg">Manual estimation coming soon. Please use file upload.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-6xl py-12">
          {/* Results Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-full px-6 py-3 mb-8 shadow-lg shadow-green-500/10">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span className="text-green-400 font-semibold text-base">Analysis Complete</span>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-700 rounded-xl p-6 hover:border-zinc-600 transition-all hover:shadow-xl hover:shadow-zinc-800/50">
                <h3 className="text-xs text-gray-400 mb-3 uppercase tracking-widest font-medium">Total Bill</h3>
                <div className="text-4xl font-bold text-white mb-2">
                  ${resultsData?.current_spend?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
                </div>
                <p className="text-sm text-gray-500">Current monthly spend</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-950/50 to-emerald-950/50 border border-green-500/40 rounded-xl p-6 hover:border-green-500/60 transition-all hover:shadow-xl hover:shadow-green-500/20">
                <h3 className="text-xs text-green-400 mb-3 uppercase tracking-widest font-medium">Projected Cost</h3>
                <div className="text-4xl font-bold text-green-400 mb-2">
                  ${resultsData?.optimized_spend?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
                </div>
                <p className="text-sm text-green-500/80">↓ {resultsData?.savings_percentage || 0}% with RI/SP</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-950/50 to-amber-950/50 border border-orange-500/40 rounded-xl p-6 hover:border-orange-500/60 transition-all hover:shadow-xl hover:shadow-orange-500/20">
                <h3 className="text-xs text-orange-400 mb-3 uppercase tracking-widest font-medium">Monthly Savings</h3>
                <div className="text-4xl font-bold text-orange-400 mb-2">
                  ${resultsData?.monthly_savings?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
                </div>
                <p className="text-sm text-orange-500/80">Per month</p>
              </div>
              
              <div className="bg-gradient-to-br from-amber-950/50 to-yellow-950/50 border border-amber-500/40 rounded-xl p-6 hover:border-amber-500/60 transition-all hover:shadow-xl hover:shadow-amber-500/20">
                <h3 className="text-xs text-amber-400 mb-3 uppercase tracking-widest font-medium">Annual Savings</h3>
                <div className="text-4xl font-bold text-amber-400 mb-2">
                  ${resultsData?.annual_savings?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
                </div>
                <p className="text-sm text-amber-500/80">Per year</p>
              </div>
            </div>
            
            {/* Projection Details Banner */}
            <div className="relative bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-orange-500/10 border border-green-500/30 rounded-xl p-8 mb-10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-orange-500/5 animate-pulse"></div>
              <div className="relative">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  Savings Projection with AWS RI & Savings Plans
                </h3>
                <p className="text-gray-300 text-base leading-relaxed">
                  By applying Reserved Instances and Savings Plans across your services, you can reduce your monthly AWS bill from{' '}
                  <span className="text-white font-bold">${resultsData?.current_spend?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  {' '}to{' '}
                  <span className="text-green-400 font-bold">${resultsData?.optimized_spend?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  {' '}— saving{' '}
                  <span className="text-orange-400 font-bold">${resultsData?.monthly_savings?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month</span>
                  {' '}({resultsData?.savings_percentage}% reduction).
                </p>
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">You could save</h1>
            <div className="flex items-center justify-center gap-3 text-xl mb-6">
              <span className="text-orange-400 font-bold text-2xl">
                {resultsData?.savings_percentage?.toFixed(1) || 0}%
              </span>
              <span className="text-gray-400 text-lg">reduction in AWS costs</span>
            </div>
            
            {resultsData?.has_reserved_instances && (
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/40 rounded-xl px-8 py-4 mt-4 shadow-lg shadow-orange-500/10">
                <CheckCircle className="w-5 h-5 text-orange-400" />
                <p className="text-base text-orange-300 font-medium">
                  We detected existing Reserved Instances or Savings Plans and calculated savings only on on-demand resources.
                </p>
              </div>
            )}
          </div>

          {/* Savings Breakdown Table */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl border border-zinc-700 overflow-hidden mb-8 shadow-2xl">
            <div className="px-8 py-6 border-b border-zinc-700 bg-zinc-900/50">
              <h2 className="text-2xl font-bold text-white">Savings Breakdown</h2>
              <p className="text-sm text-gray-400 mt-1">Detailed cost analysis by service</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700 bg-zinc-900/30">
                    <th className="px-8 py-5 text-left text-sm font-semibold text-gray-300 uppercase tracking-wide">Service</th>
                    <th className="px-8 py-5 text-right text-sm font-semibold text-gray-300 uppercase tracking-wide">Current Cost</th>
                    <th className="px-8 py-5 text-right text-sm font-semibold text-gray-300 uppercase tracking-wide">Projected Cost</th>
                    <th className="px-8 py-5 text-right text-sm font-semibold text-gray-300 uppercase tracking-wide">Savings</th>
                    <th className="px-8 py-5 text-center text-sm font-semibold text-gray-300 uppercase tracking-wide">Coverage</th>
                    <th className="px-8 py-5 text-left text-sm font-semibold text-gray-300 uppercase tracking-wide">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsData?.breakdown?.map((item, index) => {
                    const originalCost = item.original_cost || item.on_demand_cost;
                    const savingsPct = item.savings_percentage || ((item.savings / originalCost) * 100);
                    
                    return (
                      <tr key={index} className="border-b border-zinc-800 hover:bg-gradient-to-r hover:from-zinc-800/40 hover:to-zinc-900/40 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-2">
                            <span className="text-base text-white font-semibold">{item.service}</span>
                            {item.reserved_portion > 0 && (
                              <span className="text-sm text-blue-400 flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" />
                                ${item.reserved_portion.toLocaleString()} covered by RI/SP
                              </span>
                            )}
                            {item.usage_hours && item.usage_hours < 730 && (
                              <span className="text-sm text-yellow-400 flex items-center gap-1.5">
                                <span className="text-base">⚠</span>
                                {item.usage_hours}h/month usage
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-base text-white font-semibold">
                              ${originalCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            {(item.compute_cost || item.storage_cost || item.coverage_percentage > 0) && (
                              <span className="text-sm text-gray-400">
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
                              <span className="text-sm text-blue-400 flex items-center gap-1.5 justify-end">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                Linux: ${item.linux_cost?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}, 
                                RHEL: ${item.rhel_cost?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="text-base text-white font-semibold">
                            ${item.optimized_cost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-green-400 font-bold text-xl bg-green-400/10 px-3 py-1 rounded-lg">
                              -${item.savings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-sm text-green-400 font-semibold">
                              {savingsPct.toFixed(1)}% savings
                            </span>
                            {item.commitment_type && item.commitment_type !== 'N/A' && item.savings > 0 && (
                              <span className="text-sm text-gray-500">
                                via {item.commitment_type}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border-2 ${
                            item.coverage_percentage >= 90 
                              ? 'bg-blue-500/20 border-blue-400/50 text-blue-300 shadow-lg shadow-blue-500/20' 
                              : item.coverage_percentage > 0
                              ? 'bg-purple-500/20 border-purple-400/50 text-purple-300 shadow-lg shadow-purple-500/20'
                              : 'bg-green-500/20 border-green-400/50 text-green-300 shadow-lg shadow-green-500/20'
                          }`}>
                            <CheckCircle className="w-4 h-4" />
                            {item.coverage}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-2">
                            {item.savings > 0 && (
                              <>
                                <span className="text-sm text-white font-semibold">
                                  {item.commitment_type}
                                </span>
                                {item.on_demand_portion > 100 && (
                                  <span className="text-sm text-orange-400 flex items-center gap-1.5">
                                    <span className="text-base">💡</span>
                                    Apply to ${item.on_demand_portion.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} on-demand
                                  </span>
                                )}
                                {/* Show 24/7 filtering for all eligible services */}
                                {item.savings > 0 && item.commitment_type && !item.commitment_type.includes('Flat-rate') && !item.commitment_type.includes('N/A') && !item.commitment_type.includes('Intelligent-Tiering') && (
                                  <span className="text-sm text-blue-400 flex items-center gap-1.5">
                                    <span className="text-base">⏰</span>
                                    Only for 24/7 instances (≥720h)
                                  </span>
                                )}
                                {item.coverage_percentage >= 90 && (
                                  <span className="text-sm text-blue-400 flex items-center gap-1.5">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Almost fully optimized
                                  </span>
                                )}
                                {item.coverage_percentage === 0 && item.on_demand_portion > 100 && (
                                  <span className="text-sm text-green-400 flex items-center gap-1.5">
                                    <span className="text-base">⚡</span>
                                    High savings opportunity
                                  </span>
                                )}
                              </>
                            )}
                            {item.savings === 0 && (
                              <span className="text-sm text-gray-500">
                                {item.coverage_percentage >= 90 ? 'Fully optimized' : 'Not applicable'}
                              </span>
                            )}
                          </div>
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
            <div className="flex gap-6 justify-center">
              <Button 
                onClick={downloadExcel}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-10 py-4 rounded-xl font-semibold text-base transition-all flex items-center gap-3 shadow-xl shadow-green-600/30 hover:shadow-2xl hover:shadow-green-600/40 hover:scale-105"
              >
                <Download className="w-5 h-5" />
                Download Excel Report
              </Button>
              <Button 
                onClick={resetCalculator}
                className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 text-white px-10 py-4 rounded-xl font-semibold text-base transition-all shadow-xl shadow-zinc-800/50 hover:shadow-2xl hover:shadow-zinc-700/50 hover:scale-105"
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
