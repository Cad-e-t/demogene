
import express from 'express';
import cors from 'cors';
import { generateUploadUrl, deleteVideo, processVideo } from './controllers.js';

const app = express();

app.use(express.json());

app.use(cors({
    origin: '*',
    exposedHeaders: ['X-Video-Id']
}));

// We can remove the strict 5 min timeout middleware or leave it as a safety net.
// Since we respond immediately with 202, this timeout won't be triggered by normal processing.
app.use((req, res, next) => {
    res.setTimeout(300000, () => {
        // Only logs if the actual initial handshake takes > 5 mins (unlikely)
        console.log('Request has timed out.'); 
    });
    next();
});

app.get('/', (req, res) => res.send('DemoGen API Running'));

app.post('/generate-upload-url', generateUploadUrl);
app.delete('/videos/:id', deleteVideo);
app.post('/process-video', processVideo);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
