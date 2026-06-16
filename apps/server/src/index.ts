import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@trade-pilot/api/context";
import { appRouter } from "@trade-pilot/api/routers/index";
import { auth } from "@trade-pilot/auth";
import { env } from "@trade-pilot/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { registerAlphaScanJobs } from "./jobs/alpha-scan";
import { registerMarketResearchJobs } from "./jobs/market-research";
import { registerOrderSyncJobs } from "./jobs/order-sync";
import { registerProfitTrackerJobs } from "./jobs/profit-tracker";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => createContext({ context }),
	})
);

app.get("/", (c) => c.text("OK"));

import { serve } from "@hono/node-server";

serve(
	{
		fetch: app.fetch,
		port: 3000,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
		registerMarketResearchJobs();
		registerAlphaScanJobs();
		registerOrderSyncJobs();
		registerProfitTrackerJobs();
	}
);
