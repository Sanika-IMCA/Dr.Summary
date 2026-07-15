import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import documentRoutes from "./routes/document";
import prisma from "./config/db";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Custom security rate limiter middleware (zero dependencies)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 50; // Allow up to 50 requests per window

const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || "unknown-ip";
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (userLimit.count >= MAX_REQUESTS) {
    res.status(429).json({
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again after 15 minutes."
    });
    return;
  }

  userLimit.count += 1;
  next();
};

// Middleware
app.use(cors());
app.use(rateLimiter); // Apply security rate limiter globally
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads for front-end preview if needed (e.g., viewing images)
app.use("/uploads", express.static(uploadDir));

// Routes
app.use("/api/documents", documentRoutes);

// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message || "An unexpected error occurred",
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Dr.Summary Backend running on port ${PORT}`);
});

// Automatic Temporary File Storage cleanup job (runs every 1 hour)
// Safely deletes documents and their local files that are older than 24 hours
setInterval(async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  try {
    const expiredDocs = await prisma.uploadedDocument.findMany({
      where: {
        createdAt: {
          lt: oneDayAgo
        }
      }
    });

    for (const doc of expiredDocs) {
      if (fs.existsSync(doc.filePath)) {
        try {
          fs.unlinkSync(doc.filePath);
        } catch (fileErr) {
          console.error(`Failed to delete expired file ${doc.filePath}:`, fileErr);
        }
      }
      await prisma.uploadedDocument.delete({
        where: { id: doc.id }
      });
    }

    if (expiredDocs.length > 0) {
      console.log(`[CLEANUP] Automatically cleaned up ${expiredDocs.length} expired temporary documents.`);
    }
  } catch (cleanupErr) {
    console.error("[CLEANUP] Failed to execute automatic database cleanup:", cleanupErr);
  }
}, 60 * 60 * 1000); // 1 hour
