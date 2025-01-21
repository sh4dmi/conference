import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DisplayView from './views/DisplayView';
import AdminView from './views/AdminView';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DisplayView />} />
      <Route path="/admin" element={<AdminView />} />
    </Routes>
  );
}

export default App;