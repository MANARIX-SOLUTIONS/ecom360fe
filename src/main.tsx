import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import frFR from "antd/locale/fr_FR";
import { antdTheme } from "./theme";
import { StoreProvider } from "./contexts/StoreContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConfigProvider theme={antdTheme} locale={frFR}>
        <StoreProvider>
          <App />
        </StoreProvider>
      </ConfigProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
