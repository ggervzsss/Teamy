import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import "@/index.css";
import App from "@/App";
import QueryProvider from "@/shared/providers/QueryProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <App />
      <Toaster
        position="bottom-right"
        gutter={8}
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1e1e21",
            color: "#e4e1e7",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#b9f6ca", secondary: "#09090b" } },
          error: { iconTheme: { primary: "#ffb4ab", secondary: "#09090b" } },
        }}
      />
    </QueryProvider>
  </StrictMode>,
);
