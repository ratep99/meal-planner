import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { registerSW } from "virtual:pwa-register";
import { ActiveProfileProvider } from "@/context/active-profile-context";
import { queryClient } from "@/lib/query-client";
import App from "./App";
import "./index.css";

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ActiveProfileProvider>
          <App />
          <Toaster position="top-center" richColors closeButton />
        </ActiveProfileProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
