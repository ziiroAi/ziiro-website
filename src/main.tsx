import { HelmetProvider } from "react-helmet-async";
import App from "./app/App";
import { preloadHome } from "./app/home-route";
import { mountRoot } from "./app/mount";
import "./index.css";

const mount = () => {
  mountRoot(
    document.getElementById("root")!,
    <HelmetProvider>
      <App />
    </HelmetProvider>,
  );
};

// On `/` the funnel's chunk loads before the first commit, so the prerendered greeting never
// blanks (src/app/home-route.tsx). If it fails to load, mount anyway: the route retries it lazily.
if (window.location.pathname === "/") preloadHome().then(mount, mount);
else mount();
