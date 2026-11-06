import React from 'react';
import ReactDOM from 'react-dom/client';
import './expo-web-polyfill';
import App from '../App.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
