import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import CalculatorPage from './components/CalculatorPage';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<CalculatorPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/pricing" element={<CalculatorPage />} />
          <Route path="/customers" element={<CalculatorPage />} />
          <Route path="/docs" element={<CalculatorPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;