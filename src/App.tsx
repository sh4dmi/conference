import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DisplayView from './views/DisplayView';
import AdminView from './views/AdminView';
import BeforeConference from './components/BeforeConference';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DisplayView />} />
      <Route path="/admin" element={<AdminView />} />
      <Route path="/admin/before-conference" element={<BeforeConference />} />
    </Routes>
  );
}

export default App;