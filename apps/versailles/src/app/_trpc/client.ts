import type { AppRouter } from "../../../packages/trpc-shared";
import { inferRouterOutputs } from "@trpc/server";

import { createTRPCReact } from "@trpc/react-query";
type RouterOutputs = inferRouterOutputs<AppRouter>;

export const trpc = createTRPCReact<AppRouter>({});
