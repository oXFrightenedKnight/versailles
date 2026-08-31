// dev file for running the server locally

import { serve } from "@hono/node-server";
import app from "./app";

serve(
  {
    fetch: app.fetch,
    port: 8787,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
