import json
import random
from pathlib import Path
from datetime import datetime, timedelta

import pandas as pd
from faker import Faker

from companies import COMPANIES

# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).parent

ML_DATA_DIR = BASE_DIR / "ml_data"
DATA_DIR = BASE_DIR / "data"

CATALOG_FILE = ML_DATA_DIR / "catalog.json"
CITIES_FILE = ML_DATA_DIR / "cities.json"

OUTPUT_FILE = DATA_DIR / "master_dataset.csv"

fake = Faker("en_IN")

# --------------------------------------------------
# Configuration
# --------------------------------------------------

TOTAL_RECORDS = 5000

SEVERITY = [
    "Low",
    "Medium",
    "High",
    "Critical"
]

STATUS = [
    "Open",
    "In Progress",
    "Resolved",
    "Closed"
]

SENTIMENT = [
    "Negative",
    "Neutral",
    "Positive"
]

CHANNELS = [
    "Website",
    "Mobile App",
    "Email",
    "Customer Care",
    "Social Media"
]

# --------------------------------------------------
# Complaint Templates
# --------------------------------------------------

BANKING_COMPLAINTS = [
    "Money was deducted but the transaction failed.",
    "UPI payment failed but amount was debited.",
    "Credit card was charged twice.",
    "Debit card is blocked without reason.",
    "Loan application is still pending.",
    "Net banking is not working.",
    "Account was frozen unexpectedly.",
    "Unauthorized transaction detected."
]

ECOMMERCE_COMPLAINTS = [
    "Received a damaged {product}.",
    "Wrong {product} delivered.",
    "Refund not received.",
    "Replacement request still pending.",
    "Package marked delivered but never arrived.",
    "Received used {product}.",
    "Missing accessories in {product}.",
    "Product stopped working after two days."
]

FOOD_COMPLAINTS = [
    "Food arrived cold.",
    "Order delivered very late.",
    "Wrong food delivered.",
    "Missing items in the order.",
    "Food quality was poor.",
    "Order cancelled automatically.",
    "Packaging was damaged.",
    "Food was stale."
]

TELECOM_COMPLAINTS = [
    "No network signal.",
    "Internet speed is extremely slow.",
    "Fiber connection is down.",
    "SIM card not activated.",
    "Frequent call drops.",
    "Recharge not reflected.",
    "5G service unavailable.",
    "Broadband disconnects repeatedly."
]

HEALTHCARE_COMPLAINTS = [
    "Doctor appointment cancelled.",
    "Medicine delivered late.",
    "Incorrect medicine received.",
    "Lab report delayed.",
    "Insurance claim rejected.",
    "Hospital billing incorrect.",
    "Long waiting time.",
    "Appointment booked but doctor unavailable."
]

DEFAULT_COMPLAINTS = [
    "Poor customer service.",
    "Service quality is unacceptable.",
    "Refund is pending.",
    "Issue has not been resolved.",
    "Very disappointed with the service.",
    "Customer support never responded."
]

# --------------------------------------------------
# Helper Functions
# --------------------------------------------------

def load_json(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


catalog = load_json(CATALOG_FILE)
cities = load_json(CITIES_FILE)


def random_date():

    start = datetime.now() - timedelta(days=365)

    end = datetime.now()

    delta = end - start

    random_days = random.randint(0, delta.days)

    return (start + timedelta(days=random_days)).strftime("%Y-%m-%d")



def random_status():

    return random.choices(

        STATUS,

        weights=[30, 30, 25, 15],

        k=1

    )[0]


def generate_spam():

    if random.random() < 0.04:

        return (
            "Yes",
            random.choice([
                "Win ₹10,000 instantly!",
                "Click here to claim your prize.",
                "Earn money from home.",
                "Visit our website now.",
                "Free gift available today."
            ])
        )

    return ("No", None)

def random_duplicate():

    return random.choices(

        ["No", "Yes"],

        weights=[92, 8],

        k=1

    )[0]


def generate_complaint(sector, product):

    complaint_map = {
        "Banking": BANKING_COMPLAINTS,
        "E-Commerce": ECOMMERCE_COMPLAINTS,
        "Food Delivery": FOOD_COMPLAINTS,
        "Telecom": TELECOM_COMPLAINTS,
        "Healthcare": HEALTHCARE_COMPLAINTS
    }

    templates = complaint_map.get(sector, DEFAULT_COMPLAINTS)

    complaint = random.choice(templates)

    return complaint.format(product=product)

def generate_severity(sector):

    weights = {
        "Banking": [5, 20, 45, 30],
        "Telecom": [10, 40, 35, 15],
        "Food Delivery": [45, 40, 12, 3],
        "Healthcare": [5, 25, 40, 30],
        "E-Commerce": [15, 45, 30, 10]
    }

    default = [25, 40, 25, 10]

    return random.choices(
        SEVERITY,
        weights=weights.get(sector, default),
        k=1
    )[0]
def generate_sentiment(severity):

    mapping = {
        "Low": [20, 50, 30],
        "Medium": [60, 30, 10],
        "High": [85, 13, 2],
        "Critical": [97, 3, 0]
    }

    return random.choices(
        SENTIMENT,
        weights=mapping[severity],
        k=1
    )[0]

# --------------------------------------------------
# Generate One Complaint Record
# --------------------------------------------------

def generate_record(record_number):

    sector = random.choice(list(catalog.keys()))

    company = random.choice(COMPANIES[sector])

    product = random.choice(catalog[sector])

    customer_name = fake.name()

    age = random.randint(18, 70)

    gender = fake.random_element(
        ["Male", "Female", "Other"]
    )

    city = random.choice(cities)

    complaint = generate_complaint(sector, product)

    severity = generate_severity(sector)

    status = random_status()

    sentiment = generate_sentiment(severity)

    duplicate = random_duplicate()

    if severity == "Low":
        support_count = random.randint(0, 20)

    elif severity == "Medium":
        support_count = random.randint(10, 80)

    elif severity == "High":
        support_count = random.randint(50, 250)

    else:   # Critical
        support_count = random.randint(150, 1000)

    if severity == "Low":
        images = random.randint(0, 1)

    elif severity == "Medium":
        images = random.randint(0, 2)

    elif severity == "High":
        images = random.randint(1, 4)

    else:   # Critical
        images = random.randint(2, 6)

    channel = random.choice(CHANNELS)

    complaint_date = random_date()

    spam, spam_text = generate_spam()

    if spam == "Yes":
        complaint = spam_text

    # Resolution Days

    if status in ["Resolved", "Closed"]:

        if severity == "Low":
            resolution_days = random.randint(1, 5)

        elif severity == "Medium":
            resolution_days = random.randint(3, 10)

        elif severity == "High":
            resolution_days = random.randint(7, 20)

        else:
            resolution_days = random.randint(15, 45)

    else:

        resolution_days = None

    # Priority Score

    priority_score = {

        "Low": 1,
        "Medium": 2,
        "High": 3,
        "Critical": 4

    }[severity]

    # Rating
    if status in ["Resolved", "Closed"]:

        if severity == "Low":
            customer_rating = random.randint(4, 5)

        elif severity == "Medium":
            customer_rating = random.randint(3, 5)

        elif severity == "High":
            customer_rating = random.randint(2, 4)

        else:
            customer_rating = random.randint(1, 3)

    else:
        customer_rating = None
    # AI Confidence (for future models)

    if spam == "Yes":

        ai_confidence = round(
            random.uniform(0.95, 1.00),
            2
        )

    elif severity == "Critical":

        ai_confidence = round(
            random.uniform(0.90, 0.99),
            2
        )

    elif severity == "High":

        ai_confidence = round(
            random.uniform(0.85, 0.95),
            2
        )

    elif severity == "Medium":

        ai_confidence = round(
            random.uniform(0.75, 0.90),
            2
        )

    else:

        ai_confidence = round(
            random.uniform(0.70, 0.85),
            2
        )

    return {

        "complaint_id": f"CMP{record_number:06d}",

        "customer_name": customer_name,

        "age": age,

        "gender": gender,

        "city": city,

        "sector": sector,

        "company": company,

        "product_service": product,

        "complaint": complaint,

        "severity": severity,

        "priority_score": priority_score,

        "status": status,

        "sentiment": sentiment,

        "spam": spam,

        "duplicate": duplicate,

        "support_count": support_count,

        "images_attached": images,

        "channel": channel,

        "customer_rating": customer_rating,

        "resolution_days": resolution_days,

        "ai_confidence": ai_confidence,

        "complaint_date": complaint_date

    }
# --------------------------------------------------
# Generate Complete Dataset
# --------------------------------------------------

def generate_dataset(total_records=TOTAL_RECORDS):

    dataset = []

    print("=" * 50)
    print("Generating Consumer Complaint Dataset...")
    print("=" * 50)

    for i in range(1, total_records + 1):

        dataset.append(generate_record(i))

        if i % 500 == 0:
            print(f"Generated {i} records...")

    return pd.DataFrame(dataset)


# --------------------------------------------------
# Save Dataset
# --------------------------------------------------

def save_dataset(df):

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8"
    )

    print("\nDataset Saved Successfully!")
    print(f"Location : {OUTPUT_FILE}")
    print(f"Rows     : {len(df)}")
    print(f"Columns  : {len(df.columns)}")


# --------------------------------------------------
# Dataset Statistics
# --------------------------------------------------

def print_statistics(df):

    print("\n" + "=" * 50)
    print("DATASET SUMMARY")
    print("=" * 50)

    print(f"\nTotal Records : {len(df)}")

    print("\nSector Distribution")
    print(df["sector"].value_counts())

    print("\nSeverity Distribution")
    print(df["severity"].value_counts())

    print("\nStatus Distribution")
    print(df["status"].value_counts())

    print("\nSentiment Distribution")
    print(df["sentiment"].value_counts())

    print("\nSpam Distribution")
    print(df["spam"].value_counts())

    print("\nDuplicate Distribution")
    print(df["duplicate"].value_counts())

    print("\nTop 10 Companies")

    print(
        df["company"]
        .value_counts()
        .head(10)
    )

    print("\nSample Records")

    print(
        df.head(5)
    )


# --------------------------------------------------
# Main
# --------------------------------------------------

def main():

    df = generate_dataset()

    save_dataset(df)

    print_statistics(df)


if __name__ == "__main__":

    main()

