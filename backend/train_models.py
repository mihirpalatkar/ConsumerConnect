import joblib
import pandas as pd
from pathlib import Path

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
)
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).parent

DATASET_PATH = BASE_DIR / "data" / "master_dataset.csv"

MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

# --------------------------------------------------
# Spam Detection Model
# --------------------------------------------------


def train_spam_model(df):

    print("\n" + "=" * 50)
    print("TRAINING SPAM DETECTION MODEL")
    print("=" * 50)

    X = df["complaint"]
    y = df["spam"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    spam_model = Pipeline(
        [
            ("tfidf", TfidfVectorizer(stop_words="english")),
            ("classifier", LogisticRegression(max_iter=1000, random_state=42)),
        ]
    )

    spam_model.fit(X_train, y_train)

    predictions = spam_model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)

    print(f"\nAccuracy : {accuracy:.2%}")

    print("\nClassification Report\n")

    print(classification_report(y_test, predictions, zero_division=0))

    model_path = MODEL_DIR / "spam_detector.pkl"

    joblib.dump(spam_model, model_path)

    print("\nModel Saved Successfully!")
    print(f"Location : {model_path}")


def train_severity_model(df):

    print("\n" + "=" * 50)
    print("TRAINING SEVERITY CLASSIFICATION MODEL")
    print("=" * 50)

    X = df["complaint"]
    y = df["severity"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    severity_model = Pipeline(
        [
            ("tfidf", TfidfVectorizer(stop_words="english")),
            ("classifier", LogisticRegression(max_iter=1000, random_state=42)),
        ]
    )

    severity_model.fit(X_train, y_train)

    predictions = severity_model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)

    print(f"\nAccuracy : {accuracy:.2%}")

    print("\nClassification Report\n")

    print(classification_report(y_test, predictions, zero_division=0))

    joblib.dump(severity_model, MODEL_DIR / "severity_classifier.pkl")

    print("\nSeverity Model Saved Successfully!")


def train_sector_model(df):

    print("\n" + "=" * 50)
    print("TRAINING SECTOR CLASSIFICATION MODEL")
    print("=" * 50)

    X = df["complaint"]
    y = df["sector"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    sector_model = Pipeline(
        [
            ("tfidf", TfidfVectorizer(stop_words="english")),
            ("classifier", LogisticRegression(max_iter=1000, random_state=42)),
        ]
    )

    sector_model.fit(X_train, y_train)

    predictions = sector_model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)

    print(f"\nAccuracy : {accuracy:.2%}")

    print("\nClassification Report\n")

    print(classification_report(y_test, predictions, zero_division=0))

    model_path = MODEL_DIR / "sector_classifier.pkl"

    joblib.dump(sector_model, model_path)

    print("\nSector Model Saved Successfully!")
    print(f"Location : {model_path}")


def train_resolution_model(df):

    print("\n" + "=" * 50)
    print("TRAINING RESOLUTION TIME PREDICTION MODEL")
    print("=" * 50)

    data = df[df["resolution_days"].notna()].copy()

    X = data[
        [
            "complaint",
            "severity",
            "sector",
            "support_count",
            "images_attached",
        ]
    ]

    y = data["resolution_days"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
    )

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "text",
                TfidfVectorizer(stop_words="english"),
                "complaint",
            ),
            (
                "category",
                OneHotEncoder(handle_unknown="ignore"),
                ["severity", "sector"],
            ),
            (
                "numeric",
                SimpleImputer(strategy="median"),
                ["support_count", "images_attached"],
            ),
        ]
    )

    model = Pipeline(
        [
            ("preprocessor", preprocessor),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=200,
                    random_state=42,
                ),
            ),
        ]
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)

    rmse = root_mean_squared_error(y_test, predictions)

    r2 = r2_score(y_test, predictions)

    print(f"\nMAE  : {mae:.2f} days")
    print(f"RMSE : {rmse:.2f} days")
    print(f"R²   : {r2:.3f}")

    model_path = MODEL_DIR / "resolution_predictor.pkl"

    joblib.dump(model, model_path)

    print("\nResolution Model Saved Successfully!")
    print(f"Location : {model_path}")


# --------------------------------------------------
# Main
# --------------------------------------------------


def main():

    if not DATASET_PATH.exists():
        print("Dataset not found!")
        return

    df = pd.read_csv(DATASET_PATH)

    print("=" * 50)
    print("DATASET LOADED")
    print("=" * 50)

    print(df.head())

    print(f"\nTotal Records : {len(df)}")

    train_spam_model(df)
    train_severity_model(df)
    train_sector_model(df)
    train_resolution_model(df)


if __name__ == "__main__":
    main()
