import { authHandlers } from "./auth";

/** One list per module. Each module's handlers implement contracts/openapi/<module>.yaml. */
export const handlers = [...authHandlers];
