import fitz  # PyMuPDF
import os

# PDF paths
pdfs = [
    r"C:\Users\Israel\Downloads\CCI Crop Steering Super System Final Base.pdf",
    r"C:\Users\Israel\Downloads\Spanish Handbook - Metric DIGITAL V16 (1).pdf"
]

output_dir = r"C:\Users\Israel\Desktop\PKGrower\docs\crop_steering"
os.makedirs(output_dir, exist_ok=True)

for pdf_path in pdfs:
    if not os.path.exists(pdf_path):
        print(f"PDF not found: {pdf_path}")
        continue

    pdf_name = os.path.splitext(os.path.basename(pdf_path))[0][:20]  # Short name
    doc = fitz.open(pdf_path)

    print(f"Converting {pdf_name} ({len(doc)} pages)...")

    for page_num in range(len(doc)):
        page = doc[page_num]
        # Higher resolution for readability
        mat = fitz.Matrix(2, 2)  # 2x zoom
        pix = page.get_pixmap(matrix=mat)
        output_path = os.path.join(output_dir, f"{pdf_name}_page_{page_num + 1:03d}.png")
        pix.save(output_path)
        print(f"  Saved: page {page_num + 1}")

    doc.close()

print(f"\nDone! Images saved to: {output_dir}")
