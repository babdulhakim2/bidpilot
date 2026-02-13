import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json({ error: "Reference required" }, { status: 400 });
    }

    // Verify transaction with Paystack
    const result = await convex.action(api.billing.paystack.verifyTransaction, {
      reference,
    });

    // If successful, create/update subscription
    if (result.status === "success") {
      const plan = result.metadata?.plan;
      
      if (plan && ["starter", "pro"].includes(plan)) {
        // Get user from Convex by Clerk ID
        const user = await convex.query(api.users.getByClerkId, { clerkId });
        
        if (user) {
          // Create subscription
          await convex.mutation(api.billing.subscriptions.createFromPayment, {
            userId: user._id,
            plan: plan as "starter" | "pro",
            paystackCustomerId: result.customer?.customer_code,
            paystackAuthorizationCode: result.authorization?.authorization_code,
            transactionReference: reference,
          });

          // Record transaction
          await convex.mutation(api.billing.subscriptions.recordTransaction, {
            userId: user._id,
            type: "subscription",
            status: "success",
            amountNaira: result.amount / 100,
            paystackReference: reference,
            paystackTransactionId: result.transactionId,
            paystackChannel: result.channel,
            cardLast4: result.authorization?.last4,
            cardBrand: result.authorization?.brand,
            description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan subscription`,
          });
        }
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
