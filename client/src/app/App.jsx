import { BrowserRouter } from "react-router-dom";
import Routes from "./routes";
import { AppProvider } from "./providers";
import ScrollProgress from "../components/common/ScrollProgress";

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes />
      </AppProvider>
    </BrowserRouter>
  );
}