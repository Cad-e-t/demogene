import { v4 as uuidv4 } from 'uuid';
import { s3, R2_BUCKET, R2_PUBLIC_URL } from './storage.js';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateImage } from './gemini.js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getKeyFromUrl(url) {
    if (!url) return null;
    const parts = url.split('.com/');
    return parts.length > 1 ? parts[1] : null;
}

export const generateAvatarUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) return res.status(400).json({ error: 'Missing fileName or fileType' });

    const key = `avatars/${uuidv4()}_${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    res.json({ uploadUrl, publicUrl, key });
  } catch (err) {
    console.error("Presigned URL Error:", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
};

export const saveAvatar = async (req, res) => {
    try {
        const { userId, url } = req.body;
        if (!userId || !url) return res.status(400).json({ error: 'Missing userId or url' });

        const { data, error } = await supabase
            .from('avatar')
            .insert([{ user_id: userId, url }])
            .select('*')
            .single();

        if (error) throw error;
        res.json({ avatar: data });
    } catch (err) {
        console.error("Save Avatar Error:", err);
        res.status(500).json({ error: "Failed to save avatar" });
    }
};

export const getAvatars = async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('avatar')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ avatars: data });
    } catch (err) {
        console.error("Get Avatars Error:", err);
        res.status(500).json({ error: "Failed to fetch avatars" });
    }
};

export const deleteAvatar = async (req, res) => {
    try {
        const { id } = req.params;
        const { url, userId } = req.body;

        if (!id || !url || !userId) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // 1. Delete from storage
        const key = getKeyFromUrl(url);
        if (key) {
            await s3.send(new DeleteObjectCommand({
                Bucket: R2_BUCKET,
                Key: key
            })).catch(err => console.error("Failed to delete avatar from storage:", err));
        }

        // 2. Delete from DB
        const { error } = await supabase
            .from('avatar')
            .delete()
            .match({ id: id, user_id: userId });

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error("Delete Avatar Error:", err);
        res.status(500).json({ error: "Failed to delete avatar" });
    }
};

export const generateAvatarImage = async (req, res) => {
    let charged = false;
    const { userId, prompt, aspectRatio } = req.body;
    
    if (!userId || !prompt) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    try {
        const cost = 4;
        
        // 0. Check credits first
        const { data: userCredits } = await supabase.rpc('get_active_credits', { p_user_id: userId });
        if ((userCredits || 0) < cost) {
            return res.status(402).json({ error: "Insufficient credits" });
        }

        // 1. Charge credits (4 credits)
        const { error: chargeError } = await supabase.rpc('charge_creator_credits', {
            p_user_id: userId,
            p_amount: cost,
            p_description: `Generated avatar`
        });

        if (chargeError) {
            throw chargeError;
        }
        charged = true;

        // 2. Generate Image
        const fullPrompt = `Full body view, and pure white background. ${prompt}`;
        const base64Img = await generateImage(fullPrompt, aspectRatio || '9:16');
        const buffer = Buffer.from(base64Img, 'base64');
        
        // 3. Upload to R2
        const key = `avatars/${uuidv4()}.png`;
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: 'image/png'
        }));

        const url = `${R2_PUBLIC_URL}/${key}`;

        // 4. Save to DB
        const { data, error } = await supabase
            .from('avatar')
            .insert([{ user_id: userId, url }])
            .select('*')
            .single();

        if (error) throw error;

        res.json({ avatar: data });

    } catch (err) {
        console.error("Generate Avatar Error:", err);
        if (charged) {
            const { error: refundErr } = await supabase.rpc('refund_creator_credits', {
                p_user_id: userId,
                p_amount: 4,
                p_description: `Refund for failed avatar generation`
            });
            if (refundErr) {
                console.error("Refund failed:", refundErr);
            }
        }
        res.status(500).json({ error: "Failed to generate avatar" });
    }
};
