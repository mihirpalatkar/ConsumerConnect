from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from app.models.issue import Issue

model = SentenceTransformer("all-MiniLM-L6-v2")


def find_duplicate(title, description, threshold=0.80):

    new_text = f"{title}. {description}"

    issues = Issue.query.all()

    if not issues:
        return None

    texts = [f"{issue.title}. {issue.description}" for issue in issues]

    embeddings = model.encode(texts)
    new_embedding = model.encode([new_text])

    similarities = cosine_similarity(new_embedding, embeddings)[0]

    best_index = similarities.argmax()
    best_score = similarities[best_index]

    if best_score >= threshold:
        return {"issue": issues[best_index], "score": float(best_score)}

    return None
