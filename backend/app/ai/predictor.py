import joblib
from pathlib import Path

# --------------------------------------------------
# Load Models
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent.parent

MODEL_DIR = BASE_DIR / "models"

spam_model = joblib.load(
    MODEL_DIR / "spam_detector.pkl"
)

severity_model = joblib.load(
    MODEL_DIR / "severity_classifier.pkl"
)

sector_model = joblib.load(
    MODEL_DIR / "sector_classifier.pkl"
)

resolution_model = joblib.load(
    MODEL_DIR / "resolution_predictor.pkl"
)


# --------------------------------------------------
# Prediction Function
# --------------------------------------------------

def predict_complaint(
    complaint: str,
    support_count: int,
    images_attached: int,
):
    """
    Predict complaint details using trained ML models.
    """

    spam = spam_model.predict([complaint])[0]

    severity = severity_model.predict([complaint])[0]

    sector = sector_model.predict([complaint])[0]

    resolution_input = {
        "complaint": complaint,
        "severity": severity,
        "sector": sector,
        "support_count": support_count,
        "images_attached": images_attached,
    }

    import pandas as pd

    resolution_df = pd.DataFrame([resolution_input])

    resolution_days = round(
        resolution_model.predict(resolution_df)[0]
    )

    return {
        "spam": spam,
        "severity": severity,
        "sector": sector,
        "resolution_days": int(resolution_days),
    }