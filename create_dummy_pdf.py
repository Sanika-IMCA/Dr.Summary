import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def create_pdf(filename="test_dummy.pdf"):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, height - 80, "Dr.Summary Integration Test")
    
    # Subtitle
    c.setFont("Helvetica-Oblique", 12)
    c.drawString(100, height - 100, "Generated automatically for system integration validation.")
    
    # Content Paragraphs
    c.setFont("Helvetica", 10)
    y = height - 140
    
    paragraphs = [
        "This document is a sample file used to verify the text extraction and processing capabilities of Dr.Summary.",
        "The project is structured with an Express.js backend and a Vite React frontend. It integrates Prisma ORM with a SQLite database.",
        "When a user uploads a document, the application extracts its raw text content. If the file is a PDF, it uses the pdf-parse library to extract text.",
        "If it is an image file (PNG, JPG, JPEG), it utilizes Tesseract.js to run Optical Character Recognition (OCR) and read the text.",
        "After text extraction, the application invokes the Gemini 1.5 Flash model via the Google Generative AI SDK to generate structured output.",
        "This output includes a short summary (2-3 sentences), a medium summary (1-2 paragraphs), a detailed summary (multi-paragraph),",
        "essential key points categorized into TOPIC, ENTITY, CONCLUSION, or FINDING, and actionable writing suggestions.",
        "If the Gemini API key is not configured, the service falls back to a deterministic mockup mode to ensure the pipeline operates without interruptions.",
        "This concludes the sample text. Successful validation confirms that all pieces of the application work together seamlessly."
    ]
    
    for p in paragraphs:
        # Check if we need to wrap text or just draw it simply
        c.drawString(100, y, p)
        y -= 25
        
    c.save()
    print(f"Successfully generated PDF: {os.path.abspath(filename)}")

if __name__ == "__main__":
    create_pdf()
