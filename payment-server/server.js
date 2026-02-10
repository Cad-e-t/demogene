
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const DodoPayments = require('dodopayments');
const { Webhook } = require('standardwebhooks');

const app = express();
const PORT = process.env.PORT || 8087;

// --- CONFIGURATION ---
// In production, these should come from process.env
const DODO_PAYMENTS_API_KEY = process.env.DODO_PAYMENTS_API_KEY;
const DODO_WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'; 
const MODE = process.env.MODE || 'test_mode';


if (!DODO_PAYMENTS_API_KEY || !DODO_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("⚠️  Payment Server: Required environment variables missing. Server may not function correctly.");
}

// --- MIDDLEWARE ---
const allowedOrigins = new Set([
  'https://productcam.site',
  'https://demogene.vercel.app',
  'https://www.productcam.site',
  'http://localhost:3000'
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// --- CLIENTS ---
const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');

let dodo;
try {
  dodo = new DodoPayments({
    bearerToken: DODO_PAYMENTS_API_KEY,
    environment: MODE, 
  });
} catch (e) { console.log("Dodo init skipped (missing key)"); }

const webhook = new Webhook(DODO_WEBHOOK_SECRET || '');

// --- AUTH MIDDLEWARE ---
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
};

// --- WEBHOOK LOGIC ---
const processWebhookAsync = async (data) => {
    console.log(`[PaymentServer] 🟢 Processing Webhook Event: ${data.type}`);
    
    try {
        const { type, data: eventData } = data;
        
        if (!eventData) {
            console.error('[PaymentServer] 🔴 Webhook data payload is missing or invalid.');
            return;
        }

        const metadata = eventData.metadata || {};
        const userId = metadata.user_id;

        console.log(`[PaymentServer] Metadata:`, JSON.stringify(metadata));

        if (!userId) {
            console.warn('[PaymentServer] ⚠️ Webhook: No user_id in metadata. Cannot process credit grant.', data);
            return;
        }

        switch (type) {
            case 'payment.succeeded':
                console.log(`[PaymentServer] Processing payment.succeeded for User ID: ${userId}`);
                const { billing, currency, card_last_four, customer, customer_id } = eventData;
                
                // 1. Update Profile (Shared for both apps)
                const profileUpdateData = {
                     billing_address: billing,
                     last_payment_currency: currency,
                     card_last_four: card_last_four,
                     updated_at: new Date().toISOString()
                };
                if (customer_id || customer?.customer_id) {
                    profileUpdateData.dodo_customer_id = customer_id || customer?.customer_id;
                }
                if (customer?.phone_number) profileUpdateData.phone_number = customer.phone_number;
                if (customer?.email) profileUpdateData.customer_email = customer.email;
                if (customer?.name) profileUpdateData.customer_name = customer.name;

                console.log(`[PaymentServer] Updating user profile...`);
                try {
                    const { error: profileError } = await supabase.from('profiles').update(profileUpdateData).eq('id', userId);
                    if (profileError) {
                        console.error(`[PaymentServer] 🔴 Profile update failed:`, profileError);
                    } else {
                        console.log(`[PaymentServer] ✅ Profile updated successfully.`);
                    }
                } catch (updateErr) {
                    console.error(`[PaymentServer] 🔴 Exception during profile update:`, updateErr);
                }

                const credits = parseInt(metadata.credits_to_add || '0');
                const isCreatorProduct = metadata.app_type === 'creator';
                
                console.log(`[PaymentServer] Credits to add: ${credits}. Is Creator App? ${isCreatorProduct}`);

                if (credits > 0) {
                    if (isCreatorProduct) {
                        // 2a. Creator App Credits (Separate Table)
                        console.log(`[PaymentServer] Granting CREATOR credits via RPC...`);
                        try {
                            const { error } = await supabase.rpc('grant_creator_credits', {
                                p_user_id: userId,
                                p_credits_to_add: credits,
                                p_description: `Purchase of ${credits} creator credits`
                            });
                            if (error) {
                                console.error("[PaymentServer] 🔴 Creator RPC Error:", error);
                            } else {
                                console.log(`[PaymentServer] ✅ Processed CREATOR purchase of ${credits} credits for user ${userId}`);
                            }
                        } catch (rpcErr) {
                            console.error("[PaymentServer] 🔴 Creator RPC Exception:", rpcErr);
                        }
                    } else {
                        // 2b. ProductCam Credits (Existing Logic)
                        console.log(`[PaymentServer] Granting PRODUCTCAM credits via RPC...`);
                        try {
                            const { error } = await supabase.rpc('grant_credits_from_purchase', {
                                p_user_id: userId,
                                p_credits_to_add: credits,
                                p_description: `Purchase of ${credits} demo credit${credits > 1 ? 's' : ''}`,
                                p_metadata: eventData
                            });
                            if (error) {
                                console.error("[PaymentServer] 🔴 ProductCam RPC Error:", error);
                            } else {
                                console.log(`[PaymentServer] ✅ Processed PRODUCTCAM purchase of ${credits} credits for user ${userId}`);
                            }
                        } catch (rpcErr) {
                            console.error("[PaymentServer] 🔴 ProductCam RPC Exception:", rpcErr);
                        }
                    }
                } else {
                    console.warn(`[PaymentServer] ⚠️ Credits amount is 0. Skipping credit grant.`);
                }
                break;
            
            default:
                console.log(`[PaymentServer] Ignored webhook event type: ${type}`);
        }
    } catch (err) {
        console.error(`[PaymentServer] 🔴 Critical Error in processWebhookAsync:`, err);
    }
};

// --- ROUTES ---

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const payloadBuffer = req.body;
        const webhookHeaders = {
            "webhook-id": req.headers["webhook-id"],
            "webhook-signature": req.headers["webhook-signature"],
            "webhook-timestamp": req.headers["webhook-timestamp"],
        };

        if (DODO_WEBHOOK_SECRET) {
             await webhook.verify(payloadBuffer, webhookHeaders);
        }
        
        res.status(200).json({ received: true });
        
        const payloadString = payloadBuffer.toString('utf8');
        processWebhookAsync(JSON.parse(payloadString)).catch(err => {
            console.error("[PaymentServer] 🔴 Async Webhook Error:", err);
        });
    
    } catch (error) {
        console.error('[PaymentServer] 🔴 Webhook Signature Error:', error.message);
        res.status(400).json({ error: 'Invalid signature' });
    }
});

app.use(express.json());

app.post('/create-checkout-session', authMiddleware, async (req, res) => {
    console.log(`[PaymentServer] 🟢 Create Checkout Session requested by User: ${req.user?.id}`);
    
    try {
        const { productId } = req.body;
        const user = req.user;
        
        console.log(`[PaymentServer] Requested Product ID: ${productId}`);

        if (!dodo) {
            console.error("[PaymentServer] 🔴 Dodo client not initialized. Check API Key.");
            throw new Error("Dodo client not initialized");
        }

        let credits = 0;
        let isCreatorProduct = false;
        
        // ProductCam Products
        if (productId === "pdt_0NXR7yFQlGXuk4YfAk8WY") {
            credits = 10;
        } else if (productId === "pdt_0NXR7opzKCuqk7OCHV44O") {
            credits = 30;
        } else if (productId === "pdt_0NXR7hQfq3toyw4xmfZ9t") {
            credits = 100;
        } 
        // Content Creator Products
        else if (productId === "pdt_T48406oZ5JfWEo1XFEx9C") {
            credits = 700;
            isCreatorProduct = true;
        } else if (productId === "pdt_aaVFvXmh0fAAa9TMyygKI") {
            credits = 1800;
            isCreatorProduct = true;
        } else if (productId === "pdt_IkNZmPAGOSqCxUpSBwg2r") {
            credits = 5500;
            isCreatorProduct = true;
        }

        console.log(`[PaymentServer] Resolved Credits: ${credits}, isCreatorProduct: ${isCreatorProduct}`);

        const { data: profile } = await supabase
            .from('profiles')
            .select('dodo_customer_id, billing_address, customer_email, customer_name')
            .eq('id', user.id)
            .single();

        const returnUrl = isCreatorProduct 
            ? `${FRONTEND_URL}/content-creator/billing?payment_status=success`
            : `${FRONTEND_URL}/?payment_status=success`;

        const checkoutPayload = {
            product_cart: [{ product_id: productId, quantity: 1 }], 
            billing_currency: 'USD',
            return_url: returnUrl, 
            show_saved_payment_methods: true,
            metadata: {
                user_id: user.id,
                credits_to_add: String(credits),
                product_id: productId,
                app_type: isCreatorProduct ? 'creator' : 'productcam'
            }
        };

        if (profile?.dodo_customer_id) {
             console.log(`[PaymentServer] Using existing customer ID: ${profile.dodo_customer_id}`);
             checkoutPayload.customer = {
                 customer_id: profile.dodo_customer_id
             };
             if (profile.customer_email) checkoutPayload.customer.email = profile.customer_email;
             if (profile.customer_name) checkoutPayload.customer.name = profile.customer_name;
             if (profile.billing_address) checkoutPayload.billing_address = profile.billing_address;
        }

        console.log(`[PaymentServer] Sending request to Dodo Payments...`);
        const session = await dodo.checkoutSessions.create(checkoutPayload);
        
        console.log(`[PaymentServer] ✅ Checkout Session Created: ${session.checkout_url}`);
        res.json({ checkout_url: session.checkout_url });

    } catch (error) {
        console.error('[PaymentServer] 🔴 Create Checkout Session Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => res.send("Payment Service Running"));

app.listen(PORT, () => console.log(`Payment Server on ${PORT}`));
