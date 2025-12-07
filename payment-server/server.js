const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const DodoPayments = require('dodopayments');
const { Webhook } = require('standardwebhooks');

const app = express();
const PORT = process.env.PORT || 8087;

// --- CONFIGURATION ---
// In production, these should come from process.env
// For demo purposes, they are pulled from env if available
const DODO_PAYMENTS_API_KEY = process.env.DODO_PAYMENTS_API_KEY;
const DODO_WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'; // Or wherever frontend is hosted
const MODE = process.env.MODE || 'test_mode';


if (!DODO_PAYMENTS_API_KEY || !DODO_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("⚠️  Payment Server: Required environment variables missing. Server may not function correctly.");
}

// --- MIDDLEWARE ---
app.use(cors({ origin: '*' })); // Allow all for demo

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
    const { type, data: eventData } = data;
    const metadata = eventData.metadata || {};
    const userId = metadata.user_id;

    if (!userId) {
        console.warn('Webhook: No user_id in metadata.', data);
        return;
    }

    switch (type) {
        case 'payment.succeeded':
            // Update profile with payment info if needed
            const { billing, currency, card_last_four, customer, customer_id } = eventData;
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
            
            // Save Name and Email from Webhook to Profile so we can reuse them for future checkouts
            if (customer?.email) profileUpdateData.customer_email = customer.email;
            if (customer?.name) profileUpdateData.customer_name = customer.name;

            await supabase.from('profiles').update(profileUpdateData).eq('id', userId);

            // Grant Credits
            // We trust metadata from our checkout session creation
            const credits = parseInt(metadata.credits_to_add || '0');
            if (credits > 0) {
                const { error } = await supabase.rpc('grant_credits_from_purchase', {
                    p_user_id: userId,
                    p_credits_to_add: credits,
                    p_description: `Purchase of ${credits} demos`,
                    p_metadata: eventData
                });
                if (error) console.error("RPC Error:", error);
                else console.log(`Granted ${credits} credits to ${userId}`);
            }
            break;
        
        default:
            // ignore
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
        processWebhookAsync(JSON.parse(payloadString)).catch(console.error);
    
    } catch (error) {
        console.error('Webhook Error:', error.message);
        res.status(400).json({ error: 'Invalid signature' });
    }
});

app.use(express.json());

app.post('/create-checkout-session', authMiddleware, async (req, res) => {
    try {
        const { productId } = req.body;
        const user = req.user;

        if (!dodo) throw new Error("Dodo client not initialized");

        // Logic for "10 Demos for $3"
        // In real DodoPayments, you create a product in their dashboard and use that ID.
        // Here we simulate or use a dynamic/real ID.
        let amount = 300; // $3.00 USD (in cents)
        let credits = 10;
        let finalProductId = productId;

        // Fetch profile to see if returning customer
        const { data: profile } = await supabase
            .from('profiles')
            .select('dodo_customer_id, billing_address, customer_email, customer_name')
            .eq('id', user.id)
            .single();

        const checkoutPayload = {
            product_cart: [{ product_id: finalProductId, quantity: 1 }], 
            billing_currency: 'USD',
            return_url: `${FRONTEND_URL}/?payment_status=success`, // Redirects to home with param
            metadata: {
                user_id: user.id,
                credits_to_add: String(credits),
                product_id: finalProductId
            }
            // Customer object is purposely omitted here for first-time users.
            // DodoPayments will collect it on the checkout page.
        };

        // If returning customer, inject the stored ID, Name, and Email
        if (profile?.dodo_customer_id) {
             checkoutPayload.customer = {
                 customer_id: profile.dodo_customer_id
             };
             if (profile.customer_email) checkoutPayload.customer.email = profile.customer_email;
             if (profile.customer_name) checkoutPayload.customer.name = profile.customer_name;
             
             if (profile.billing_address) checkoutPayload.billing_address = profile.billing_address;
        }

        const session = await dodo.checkoutSessions.create(checkoutPayload);
        res.json({ checkout_url: session.checkout_url });

    } catch (error) {
        console.error('Checkout Session Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => res.send("Payment Service Running"));

app.listen(PORT, () => console.log(`Payment Server on ${PORT}`));