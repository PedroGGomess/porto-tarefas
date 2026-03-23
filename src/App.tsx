import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "@/lib/msalConfig";
import { MicrosoftCalendarProvider } from "@/context/MicrosoftCalendarContext";
import Index from "./pages/Index.tsx";
import Reunioes from "./pages/Reunioes.tsx";
import Chat from "./pages/Chat.tsx";
import Ficheiros from "./pages/Ficheiros.tsx";
import Gantt from "./pages/Gantt.tsx";
import Pipeline from "./pages/Pipeline.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MsalProvider instance={msalInstance}>
        <MicrosoftCalendarProvider>
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/cronograma" element={<Gantt />} />
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/reunioes" element={<Reunioes />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/ficheiros" element={<Ficheiros />} />
                <Route path="/auth/callback" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </MicrosoftCalendarProvider>
      </MsalProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
