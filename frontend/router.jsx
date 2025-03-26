import { createBrowserRouter } from "react-router-dom";
// import App from "./App";
import NotFound from "./pages/NotFound";
import { Voice } from "./pages/Voice";

const router = createBrowserRouter([
  {
    path: "/company/:company_id/",
    element: <Voice />,
  },
  {
    path: "/company/:company_id/application/:application_id",
    element: <Voice />,
  },
  {
    path: "/*", // Fallback route for all unmatched paths
    element: <NotFound />, // Component to render for unmatched paths
  },
]);

export default router;
