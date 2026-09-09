"""
=========================================================
FinStack AI
Vector Store
=========================================================
"""

from pathlib import Path
import json
import pickle


BASE_DIR = Path(__file__).resolve().parent

STORAGE_DIR = BASE_DIR / "storage"

CHUNK_FILE = STORAGE_DIR / "knowledge_chunks.json"
EMBEDDING_FILE = STORAGE_DIR / "knowledge_embeddings.pkl"


_chunks = None
_embeddings = None


def load_vector_store():
    """
    Load knowledge chunks and embeddings into memory.
    """

    global _chunks
    global _embeddings

    if _chunks is None:

        with open(CHUNK_FILE, "r", encoding="utf-8") as f:
            _chunks = json.load(f)

    if _embeddings is None:

        with open(EMBEDDING_FILE, "rb") as f:
            _embeddings = pickle.load(f)

    return _chunks, _embeddings


if __name__ == "__main__":

    chunks, embeddings = load_vector_store()

    print()

    print("Vector Store Loaded Successfully")

    print(f"Chunks      : {len(chunks)}")

    print(f"Embeddings  : {len(embeddings)}")