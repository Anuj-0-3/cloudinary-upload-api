import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { Readable } from "stream";
import cors from "cors";

dotenv.config();
const app = express();
const upload = multer();

app.use(cors()); // Enable cross-origin resource sharing

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use this middleware to handle the upload process progressively
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const buffer = req.file.buffer;
    const stream = Readable.from(buffer);

    // Setup a stream for Cloudinary upload
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "auction_images" },
      (error, result) => {
        if (error) {
          console.error("Error uploading to Cloudinary:", error);
          return res.status(500).json({ error: "Upload failed" });
        }

        if (!result?.secure_url) {
          return res.status(500).json({ error: "No secure URL received" });
        }

        // Return the URL once uploaded
        res.json({ url: result.secure_url });
      }
    );

    // Track upload progress
    stream.on('data', (chunk) => {
      // Here we could process each chunk or log progress
      console.log(`Uploading chunk of size: ${chunk.length} bytes`);
    });

    // Pipe the file buffer into the upload stream progressively
    stream.pipe(uploadStream);
  } catch (error) {
    console.error("Error in upload process:", error);
    res.status(500).json({ error: error.message || "Upload failed" });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Cloudinary Upload API is live!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
