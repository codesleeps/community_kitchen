import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ResidentPage from './pages/ResidentPage';
import AdminPage from './pages/AdminPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ResidentPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;
