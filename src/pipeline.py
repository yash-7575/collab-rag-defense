"""RAG pipeline: HuggingFace embeddings + FAISS + Groq LLM."""
from __future__ import annotations

from typing import Callable, Iterable

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_groq import ChatGroq

from . import config
from .corpus import load_corpus

_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "You are a precise QA assistant. Answer the user's question using ONLY "
     "the provided context passages. If the context is insufficient, say so. "
     "Answer in one short sentence."),
    ("human", "Context:\n{context}\n\nQuestion: {question}\n\nAnswer:"),
])


def _passages_to_documents(passages: Iterable[dict]) -> list[Document]:
    docs = []
    for p in passages:
        text = (p.get("title", "") + "\n" + p.get("text", "")).strip()
        docs.append(Document(page_content=text, metadata={"doc_id": p["doc_id"]}))
    return docs


_embed = None
def get_embeddings() -> HuggingFaceEmbeddings:
    global _embed
    if _embed is None:
        _embed = HuggingFaceEmbeddings(model_name=config.EMBED_MODEL)
    return _embed


def build_index(force: bool = False) -> FAISS:
    """Build FAISS from data/corpus/passages.jsonl and persist to data/faiss_index."""
    index_path = config.INDEX_DIR
    embed = get_embeddings()
    if not force and (index_path / "index.faiss").exists():
        return FAISS.load_local(str(index_path), embed, allow_dangerous_deserialization=True)

    docs = _passages_to_documents(load_corpus())
    vs = FAISS.from_documents(docs, embed)
    vs.save_local(str(index_path))
    return vs


def _get_llm() -> ChatGroq:
    if not config.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY missing. Populate .env from .env.example.")
    return ChatGroq(
        model=config.GROQ_MODEL,
        api_key=config.GROQ_API_KEY,
        temperature=0.0,
        max_tokens=config.MAX_TOKENS,
        max_retries=2,
    )


def build_query_index(extra_docs: list[Document] | None = None) -> FAISS:
    """Build a per-query FAISS by cloning the base index and adding injected docs."""
    base = build_index()
    if not extra_docs:
        return base
    # Rebuild: add extra docs on top of base corpus.
    all_docs = _passages_to_documents(load_corpus()) + extra_docs
    return FAISS.from_documents(all_docs, get_embeddings())


def answer(
    query: str,
    extra_docs: list[Document] | None = None,
    filter_fn: Callable[[list[Document]], tuple[list[Document], list[Document]]] | None = None,
    k: int = config.TOP_K,
) -> dict:
    """Run one RAG query. Returns {answer, retrieved, kept, dropped}."""
    vs = build_query_index(extra_docs)
    retrieved = vs.similarity_search(query, k=k)

    if filter_fn is not None:
        kept, dropped = filter_fn(retrieved)
    else:
        kept, dropped = retrieved, []

    context = "\n\n".join(f"[{d.metadata.get('doc_id','?')}] {d.page_content}" for d in kept) or "(no context)"
    llm = _get_llm()
    chain = _PROMPT | llm
    resp = chain.invoke({"context": context, "question": query})
    text = resp.content if hasattr(resp, "content") else str(resp)
    return {"answer": text.strip(), "retrieved": retrieved, "kept": kept, "dropped": dropped}
