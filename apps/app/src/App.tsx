import { registerAuthRequestInterceptor } from "@/modules/auth";
import { client } from "@repo/client";
import { Agentation } from "agentation";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Providers } from "./providers/providers";
import { getRouteMaps } from "./routes";

client.setConfig({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:9000",
  headers: {
    "x-api-key": `${import.meta.env.VITE_API_KEY}:${import.meta.env.VITE_API_KEY_SECRET}`,
  },
});
// Registered before the router: createBrowserRouter starts resolving the
// initial route's loaders immediately at construction time, so the
// interceptor must exist first for those requests to carry the right
// Authorization header (or none) instead of racing it.
registerAuthRequestInterceptor();
const router = createBrowserRouter(getRouteMaps());

function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
      {import.meta.env.DEV && <Agentation />}
    </Providers>
  );
}

export default App;
