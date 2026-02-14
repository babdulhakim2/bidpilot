import { httpRouter } from "convex/server";
import { handleWebhook } from "./billing/webhook";

const http = httpRouter();

// Paystack webhook endpoint
http.route({
  path: "/paystack/webhook",
  method: "POST",
  handler: handleWebhook,
});

export default http;
