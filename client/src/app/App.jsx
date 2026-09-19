import { BrowserRouter } from "react-router-dom";

import Routes from "./routes";

import { AppProvider } from "./providers";

import ScrollProgress from "../components/common/ScrollProgress";

import WestForceChatbot from "../components/chatbot/WestForceChatbot";

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>

        <ScrollProgress />

        <Routes />

        <WestForceChatbot />

      </AppProvider>
    </BrowserRouter>
  );
}