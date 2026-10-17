from io import BytesIO
import fitz  # PyMuPDF


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text from a PDF file preserving reading order and layout structure.

    Returns the extracted text as a single formatted string.
    """
    if not file_bytes:
        raise ValueError("PDF file is empty.")

    try:
        # Open PDF directly from bytes stream
        doc = fitz.open(stream=file_bytes, filetype="pdf")

        if doc.page_count == 0:
            raise ValueError("PDF file contains no pages.")

        extracted_pages = []

        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)

            # sort=True sorts text reading order (top-to-bottom, left-to-right)
            # which preserves column and line integrity much better than pypdf.
            page_text = page.get_text("text", sort=True)

            if page_text and page_text.strip():
                extracted_pages.append(page_text.strip())

        doc.close()

        extracted_text = "\n\n--- Page Break ---\n\n".join(extracted_pages).strip()

        if not extracted_text:
            raise ValueError(
                "No readable text could be extracted from this PDF. It may be a scanned image or protected."
            )

        return extracted_text

    except ValueError:
        raise
    except Exception as exc:
        raise RuntimeError(
            f"Failed to extract text from PDF using PyMuPDF: {str(exc)}"
        )