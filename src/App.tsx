import React from 'react';
import { Routes, Route, Outlet, Link, useLocation } from "react-router-dom";
import logo from './logo.svg';
import './App.css';

export default function App() {
  
  const location = useLocation();
  React.useEffect(() => {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update();
    });
  }, [location]);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          This is a PWA!
        </p>
      </header>
      <div>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </div>
      <footer>
        <p>
          Version: { process.env.REACT_APP_VERSION_ID || 'development' }
        </p>
      </footer>
    </div>
  );
}

function Layout() {
  return (
    <div>
      <nav>
        <ul className='App-nav'>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/about">About</Link>
          </li>
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}

function Home() {
  return (
    <div>
      <h2>Home</h2>
    </div>
  );
}

function About() {
  return (
    <div>
      <h2>About</h2>
    </div>
  );
}
