import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { Readable } from "stream";

dotenv.config();
const app = express();
const upload = multer();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const buffer = req.file.buffer;
    const stream = Readable.from(buffer);

    const uploadedUrl = await new Promise((resolve, reject) => {
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

    res.json({ url: uploadedUrl });
  } catch (error) {
    res.status(500).json({ error: error.message || "Upload failed" });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Cloudinary Upload API is live!");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
