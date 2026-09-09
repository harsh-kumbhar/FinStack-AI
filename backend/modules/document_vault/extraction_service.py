from io import BytesIO

from pypdf import PdfReader


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text from a PDF file.

    Returns the extracted text as a single string.
    """

    if not file_bytes:
        raise ValueError("PDF file is empty.")

    try:
        reader = PdfReader(BytesIO(file_bytes))

        pages = []

        for page in reader.pages:
            text = page.extract_text()

            if text:
                pages.append(text)

        extracted_text = "\n\n".join(pages).strip()

        if not extracted_text:
            raise ValueError(
                "No readable text could be extracted from this PDF."
            )

        return extracted_text

    except ValueError:
        raise

    except Exception as exc:
        raise RuntimeError(
            f"Failed to extract text from PDF: {str(exc)}"
        )