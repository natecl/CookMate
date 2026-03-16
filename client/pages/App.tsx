import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import MainPage from './MainPage';
import YourRecipePage from './YourRecipePage';
import CookingPage from './CookingPage';

const App = () => (
  <Routes>
    <Route path="/" element={<MainPage />} />
    <Route path="/your-recipe" element={<YourRecipePage />} />
    <Route path="/cooking" element={<CookingPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
