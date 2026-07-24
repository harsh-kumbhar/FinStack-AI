import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ProfileCompletion from "./pages/ProfileCompletion";
import FinancialHealthAnalyzer from "./pages/FinancialHealthAnalyzer";
import FinancialHealthResult from "./pages/FinancialHealthResult";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute requireProfile={false}>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/profile"
                element={
                    <ProtectedRoute requireProfile={false}>
                        <ProfileCompletion />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/health-analyzer"
                element={
                    <ProtectedRoute requireProfile={false}>
                        <FinancialHealthAnalyzer />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/health-result"
                element={
                    <ProtectedRoute requireProfile={false}>
                        <FinancialHealthResult />
                    </ProtectedRoute>
                }
            />

            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default App;