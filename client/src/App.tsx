import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { AppLayout } from "./pages/AppLayout";
import { HomePage } from "./pages/HomePage";
import { ServerPage } from "./pages/ServerPage";
import { DirectRoomPage } from "./pages/DirectRoomPage";
import { DmsPage } from "./pages/DmsPage";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="servers/:serverId" element={<ServerPage />} />
            <Route path="servers/:serverId/rooms/:roomId" element={<ServerPage />} />
            <Route path="direct/:roomId" element={<DirectRoomPage />} />
            <Route path="dms" element={<DmsPage />} />
            <Route path="dms/:friendId" element={<DmsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
