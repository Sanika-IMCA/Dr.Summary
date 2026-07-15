-- AlterTable
ALTER TABLE "UploadedDocument" ADD COLUMN "category" TEXT;
ALTER TABLE "UploadedDocument" ADD COLUMN "complexity" TEXT;
ALTER TABLE "UploadedDocument" ADD COLUMN "keywords" TEXT;
ALTER TABLE "UploadedDocument" ADD COLUMN "language" TEXT DEFAULT 'eng';
ALTER TABLE "UploadedDocument" ADD COLUMN "ocrConfidence" REAL;
ALTER TABLE "UploadedDocument" ADD COLUMN "pageCount" INTEGER;
ALTER TABLE "UploadedDocument" ADD COLUMN "processingTime" REAL;
ALTER TABLE "UploadedDocument" ADD COLUMN "readingTime" INTEGER;
ALTER TABLE "UploadedDocument" ADD COLUMN "sentiment" TEXT;
ALTER TABLE "UploadedDocument" ADD COLUMN "topics" TEXT;
ALTER TABLE "UploadedDocument" ADD COLUMN "wordCount" INTEGER;
