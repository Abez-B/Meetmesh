import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import { PageTransition } from './components/PageTransition';
import LandingPage from './pages/LandingPage';
import WaitingRoomPage from './pages/WaitingRoomPage';
import MeetingRoomPage from './pages/MeetingRoomPage';
import JoinProfilePage from './pages/JoinProfilePage';
import PresentationPage from './pages/PresentationPage';
import HostPanelPage from './pages/HostPanelPage';

const FALLBACK = (
  <div className="error-boundary-fallback">
    <h2>Something went wrong</h2>
    <p>Please try refreshing the page.</p>
    <button onClick={() => window.location.reload()}>Reload Page</button>
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition pathname={location.pathname}>
              <LandingPage />
            </PageTransition>
          }
        />
        <Route
          path="/join/:code"
          element={
            <PageTransition pathname={location.pathname}>
              <JoinProfilePage />
            </PageTransition>
          }
        />
        <Route
          path="/join/:code/waiting"
          element={
            <PageTransition pathname={location.pathname}>
              <WaitingRoomPage />
            </PageTransition>
          }
        />
        <Route
          path="/meeting/:code"
          element={
            <PageTransition pathname={location.pathname}>
              <MeetingRoomPage />
            </PageTransition>
          }
        />
        <Route
          path="/manage/:code"
          element={
            <PageTransition pathname={location.pathname}>
              <HostPanelPage />
            </PageTransition>
          }
        />
        <Route
          path="/present/:code"
          element={
            <PageTransition pathname={location.pathname}>
              <PresentationPage />
            </PageTransition>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary fallback={FALLBACK}>
        <ToastProvider>
          <div className="app-shell">
            <AnimatedRoutes />
          </div>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
