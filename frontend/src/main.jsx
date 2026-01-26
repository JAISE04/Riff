import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import LoginPage from "./components/LoginPage.jsx";
import PlaylistDownloader from "./components/PlaylistDownloader.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/playlist-downloader" element={<PlaylistDownloader />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
