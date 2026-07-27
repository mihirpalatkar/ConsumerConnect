import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{os.getenv('DB_USER')}:"
        f"{os.getenv('DB_PASSWORD')}@"
        f"{os.getenv('DB_HOST')}:"
        f"{os.getenv('DB_PORT')}/"
        f"{os.getenv('DB_NAME')}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = "consumerconnect-super-secret-key"

    # -----------------------------
    # File Upload Configuration
    # -----------------------------
    UPLOAD_FOLDER = "uploads"

    # Maximum upload size: 5 MB
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024

    # Allowed image file extensions
    ALLOWED_EXTENSIONS = {
        "png",
        "jpg",
        "jpeg"
    }