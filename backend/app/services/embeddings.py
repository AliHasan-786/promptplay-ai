"""Embedding generation service using OpenAI text-embedding-3-small.

Generates vector embeddings for video metadata, enabling semantic
similarity search across the video database.
"""

import logging
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


async def generate_embedding(text: str) -> list[float]:
    """Generate a vector embedding for the given text.

    Args:
        text: The text to embed (typically video title + description).

    Returns:
        A list of floats representing the embedding vector.
    """
    import openai

    settings = get_settings()
    client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
        dimensions=EMBEDDING_DIMENSIONS,
    )

    embedding = response.data[0].embedding
    logger.info(f"Generated embedding ({len(embedding)} dims) for: {text[:80]}...")
    return embedding


async def generate_batch_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts in a single API call.

    Args:
        texts: List of texts to embed.

    Returns:
        List of embedding vectors, in the same order as input texts.
    """
    import openai

    if not texts:
        return []

    settings = get_settings()
    client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
        dimensions=EMBEDDING_DIMENSIONS,
    )

    # Sort by index to maintain order
    embeddings = sorted(response.data, key=lambda x: x.index)
    logger.info(f"Generated {len(embeddings)} embeddings in batch")
    return [e.embedding for e in embeddings]


def build_embedding_text(
    title: str,
    channel_name: Optional[str] = None,
    description: Optional[str] = None,
) -> str:
    """Build the text string used for generating a video's embedding.

    Combines title, channel name, and a truncated description into a single
    string optimized for semantic similarity matching.
    """
    parts = [title]
    if channel_name:
        parts.append(f"by {channel_name}")
    if description:
        # Truncate long descriptions to stay within token limits
        desc = description[:500]
        parts.append(desc)
    return " | ".join(parts)
