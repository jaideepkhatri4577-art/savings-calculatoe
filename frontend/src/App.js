import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CalculatorPage from './components/CalculatorPage';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CalculatorPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;