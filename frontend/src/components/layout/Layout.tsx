import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-md"
      >
        Aller au contenu
      </a>
      <Navbar />
      <main id="main-content" className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
