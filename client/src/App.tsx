import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AppLayout } from "./pages/AppLayout";
import { HomePage } from "./pages/HomePage";
import { ServerPage } from "./pages/ServerPage";
import { RoomPage } from "./pages/RoomPage";
import { DirectRoomPage } from "./pages/DirectRoomPage";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="servers/:serverId" element={<ServerPage />} />
            <Route path="servers/:serverId/rooms/:roomId" element={<RoomPage />} />
            <Route path="direct/:roomId" element={<DirectRoomPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
