import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Gacha from './pages/Gacha';
import Mission from './pages/Mission';
import History from './pages/History';
import MapView from './pages/MapView';
import BottomNav from './components/BottomNav';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gacha" element={<Gacha />} />
        <Route path="/mission" element={<Mission />} />
        <Route path="/history" element={<History />} />
        <Route path="/map" element={<MapView />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}
