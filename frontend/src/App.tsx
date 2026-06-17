import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { ClientView } from "./pages/ClientView";
import { GraphView } from "./pages/GraphView";
import { EphemeralGraphProvider } from "./context/EphemeralGraph";

export default function App() {
  return (
    <EphemeralGraphProvider>
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Routes>
              <Route path="/" element={<ClientView />} />
              <Route path="/graph" element={<GraphView />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </EphemeralGraphProvider>
  );
}
