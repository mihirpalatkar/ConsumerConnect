from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model = SentenceTransformer("all-MiniLM-L6-v2")

CATEGORIES = {
    "Roads": [
        "pothole",
        "road damage",
        "broken road",
        "cracked road"
    ],
    "Electricity": [
        "street light",
        "power cut",
        "electric pole",
        "electricity"
    ],
    "Water Supply": [
        "water leakage",
        "pipe burst",
        "water supply",
        "no water"
    ],
    "Sanitation": [
        "garbage",
        "waste",
        "trash",
        "dirty street"
    ],
    "Public Safety": [
        "accident",
        "unsafe",
        "crime",
        "security"
    ]
}


def classify_issue(title, description):

    text = f"{title}. {description}"

    category_texts = []

    category_names = []

    for category, examples in CATEGORIES.items():

        category_names.append(category)

        category_texts.append(
            " ".join(examples)
        )

    issue_embedding = model.encode([text])

    category_embeddings = model.encode(category_texts)

    similarities = cosine_similarity(
        issue_embedding,
        category_embeddings
    )[0]

    best = similarities.argmax()

    return category_names[best]