import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/** Used by Vitest. Same handlers as the browser worker, so tests and the dev app agree. */
export const server = setupServer(...handlers);
