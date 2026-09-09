"""
=========================================================
FinStack AI
Generate Knowledge Base Embeddings
=========================================================
"""

from pathlib import Path
import json
import pickle

from sentence_transformers import SentenceTransformer


# ==========================================================
# Paths
# ==========================================================

BASE_DIR = Path(__file__).resolve().parent

KNOWLEDGE_FILE = BASE_DIR / "knowledge_base.md"
FAQ_FILE = BASE_DIR / "faq.md"

STORAGE_DIR = BASE_DIR / "storage"

CHUNK_FILE = STORAGE_DIR / "knowledge_chunks.json"
EMBEDDING_FILE = STORAGE_DIR / "knowledge_embeddings.pkl"


# ==========================================================
# Embedding Model
# ==========================================================

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)


# ==========================================================
# Read Markdown
# ==========================================================

def read_markdown(path: Path):

    with open(path, "r", encoding="utf-8") as f:

        return f.read()


# ==========================================================
# Chunk Markdown
# ==========================================================

def chunk_markdown(text):

    chunks = []

    current = []

    for line in text.splitlines():

        if line.startswith("#"):

            if current:

                chunks.append("\n".join(current).strip())

                current = []

        current.append(line)

    if current:

        chunks.append("\n".join(current).strip())

    return [c for c in chunks if len(c) > 20]


# ==========================================================
# Build Knowledge Base
# ==========================================================

def build_chunks():

    knowledge = read_markdown(KNOWLEDGE_FILE)

    faq = read_markdown(FAQ_FILE)

    kb_chunks = chunk_markdown(knowledge)

    faq_chunks = chunk_markdown(faq)

    all_chunks = kb_chunks + faq_chunks

    print(f"Knowledge Chunks : {len(kb_chunks)}")

    print(f"FAQ Chunks       : {len(faq_chunks)}")

    print(f"Total Chunks     : {len(all_chunks)}")

    return all_chunks


# ==========================================================
# Generate Embeddings
# ==========================================================

def generate_embeddings():

    chunks = build_chunks()

    embeddings = model.encode(
        chunks,
        convert_to_numpy=True,
        show_progress_bar=True
    )

    STORAGE_DIR.mkdir(exist_ok=True)

    with open(CHUNK_FILE, "w", encoding="utf-8") as f:

        json.dump(
            chunks,
            f,
            indent=2,
            ensure_ascii=False
        )

    with open(EMBEDDING_FILE, "wb") as f:

        pickle.dump(
            embeddings,
            f
        )

    print()

    print("Knowledge Base Created Successfully")

    print(f"Chunks Saved      : {CHUNK_FILE}")

    print(f"Embeddings Saved  : {EMBEDDING_FILE}")


# ==========================================================
# Main
# ==========================================================

if __name__ == "__main__":

    generate_embeddings()