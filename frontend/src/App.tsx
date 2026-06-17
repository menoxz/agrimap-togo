import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Skeleton from '@/components/ui/Skeleton';

const HomePage = lazy(() => import('@/pages/HomePage'));
const StoryPage = lazy(() => import('@/pages/StoryPage'));
const ExplorePage = lazy(() => import('@/pages/ExplorePage'));
const ReportPage = lazy(() => import('@/pages/ReportPage'));

function PageLoader() {
  return (
    <div className="container-page py-8 space-y-4">
      <Skeleton variant="text" width="60%" height="32px" />
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="card" height="300px" />
      <Skeleton variant="text" lines={3} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/story"
              element={
                <Suspense fallback={<PageLoader />}>
                  <StoryPage />
                </Suspense>
              }
            />
            <Route
              path="/explore"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ExplorePage />
                </Suspense>
              }
            />
            <Route
              path="/report"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ReportPage />
                </Suspense>
              }
            />
            {/* Toute URL inconnue (/explorer, /typo, …) → redirect silencieux vers home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
