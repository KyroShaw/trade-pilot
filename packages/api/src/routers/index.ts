import { protectedProcedure, publicProcedure, router } from "../index";
import { alphaRouter } from "./alpha";
import { marketResearchRouter } from "./market-research";
import { ordersRouter } from "./orders";
import { profitCurveRouter } from "./profit-curve";
import { todoRouter } from "./todo";
import { tradingRouter } from "./trading";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	privateData: protectedProcedure.query(({ ctx }) => ({
		message: "This is private",
		user: ctx.session.user,
	})),
	alpha: alphaRouter,
	marketResearch: marketResearchRouter,
	orders: ordersRouter,
	profitCurve: profitCurveRouter,
	todo: todoRouter,
	trading: tradingRouter,
});
export type AppRouter = typeof appRouter;
