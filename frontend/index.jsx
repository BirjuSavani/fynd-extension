import React from 'react';
import ReactDOM from 'react-dom/client';
import 'regenerator-runtime/runtime';
import { RouterProvider } from "react-router-dom";
import router from "./router";
// import App from "./App";
// import { Voice } from './pages/Voice';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
    {/* <Voice /> */}
  </React.StrictMode>
);
