import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename to avoid duplicates
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// File filter to restrict uploads to PDF and images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
  const allowedExtensions = [".pdf", ".png", ".jpg", ".jpeg"];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file format. Please upload PDF, PNG, JPG, or JPEG files."));
  }
};

// Size limit of 25 MB
const limits = {
  fileSize: 25 * 1024 * 1024,
};

export const upload = multer({
  storage,
  fileFilter,
  limits,
});
