import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { Readable } from "stream";
import cors from "cors";
import rateLimit from "express-rate-limit";

dotenv.config();
const app = express();
const upload = multer();

// TRUST PROXY for Express to recognize X-Forwarded-For header
app.set("trust proxy", 1);


// Enable cross-origin resource sharing (CORS)
app.use(cors());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Rate limiting for uploads
const uploadRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: "Too many uploads from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// 🟢 Multiple image upload endpoint (supports up to 5 images at once)
app.post("/upload", uploadRateLimiter, upload.array("files", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Upload each file to Cloudinary
    const uploadPromises = req.files.map((file) => {
      const buffer = file.buffer;
      const stream = Readable.from(buffer);

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "auction_images" },
          (error, result) => {
            if (error) return reject(error);
            if (!result?.secure_url) return reject(new Error("No secure URL"));
            resolve(result.secure_url);
          }
        );
        stream.pipe(uploadStream);
      });
    });

    const uploadedUrls = await Promise.all(uploadPromises);

    res.json({ urls: uploadedUrls });
  } catch (error) {
    console.error("Error uploading images:", error);
    res.status(500).json({ error: error.message || "Upload failed" });
  }
});

// Root route
app.get("/", (req, res) => {
  res.send("✅ Cloudinary Upload API is live!");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
