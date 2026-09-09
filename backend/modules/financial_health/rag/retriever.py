"""
=========================================================
FinStack AI
Knowledge Retriever
=========================================================
"""

import numpy as np
from sentence_transformers import SentenceTransformer

from .vector_store import load_vector_store


# ==========================================================
# Load Embedding Model (Only Once)
# ==========================================================

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_model = None


def get_embedding_model():

    global _model

    if _model is None:

        print("Loading Embedding Model...")

        _model = SentenceTransformer(MODEL_NAME)

    return _model


# ==========================================================
# Cosine Similarity
# ==========================================================

def cosine_similarity(query_embedding, knowledge_embeddings):

    query_embedding = query_embedding / np.linalg.norm(query_embedding)

    knowledge_embeddings = knowledge_embeddings / np.linalg.norm(
        knowledge_embeddings,
        axis=1,
        keepdims=True
    )

    similarities = np.dot(
        knowledge_embeddings,
        query_embedding
    )

    return similarities


# ==========================================================
# Retrieve Top Chunks
# ==========================================================

def retrieve_context(
    question: str,
    top_k: int = 5
):

    model = get_embedding_model()

    chunks, embeddings = load_vector_store()

    query_embedding = model.encode(
        question,
        convert_to_numpy=True
    )

    similarities = cosine_similarity(
        query_embedding,
        embeddings
    )

    top_indices = np.argsort(similarities)[::-1][:top_k]

    results = []

    for idx in top_indices:

        results.append(
            {
                "score": float(similarities[idx]),
                "chunk": chunks[idx]
            }
        )

    return results


# ==========================================================
# Testing
# ==========================================================

if __name__ == "__main__":

    question = input("\nAsk a financial question:\n\n> ")

    results = retrieve_context(question)

    print("\n")

    print("=" * 80)

    print("TOP MATCHES")

    print("=" * 80)

    for i, result in enumerate(results, 1):

        print(f"\nMatch {i}")

        print(f"Similarity : {result['score']:.4f}")

        print("-" * 80)

        print(result["chunk"][:500])

        print("\n")