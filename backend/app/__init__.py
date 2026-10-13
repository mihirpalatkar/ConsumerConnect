
import os

from flask import Flask, send_from_directory
from flask_migrate import Migrate

from config import Config
from app.extensions import db, jwt, cors

from app.routes.auth import auth_bp
from app.routes.issue import issue_bp
from app.routes.comment import comment_bp
from app.routes.support import support_bp
from app.routes.notification import notification_bp
from app.routes.company_auth import company_auth_bp
from app.routes.company_dashboard import company_dashboard_bp
from app.routes.company_response import company_response_bp
from app.routes.dashboard import dashboard_bp
from app.routes.admin import admin_bp
from app.routes.company import company_bp
from app.routes.history import history_bp
from app.routes.feedback import feedback_bp
from app.routes.admin_dashboard import admin_dashboard_bp
from app.routes.admin_comment import admin_comment_bp
from app.routes.admin_logs import admin_logs_bp


migrate = Migrate()


def create_app():
    app = Flask(__name__)

    # Load configuration from config.py
    app.config.from_object(Config)

    # Ensure the uploads directory exists
    upload_folder = app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)

    # CORS configuration:
    # Keep local development origins and allow additional
    # frontend origins through the CORS_ORIGINS environment variable.
    configured_origins = [
        origin.strip().rstrip("/")
        for origin in os.getenv("CORS_ORIGINS", "").split(",")
        if origin.strip()
    ]

    local_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    allowed_origins = list(
        dict.fromkeys(local_origins + configured_origins)
    )

    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": allowed_origins,
            }
        },
    )

    # Initialize database migrations
    migrate.init_app(app, db)

    # Register application blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(issue_bp)
    app.register_blueprint(comment_bp)
    app.register_blueprint(support_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(company_auth_bp)
    app.register_blueprint(company_dashboard_bp)
    app.register_blueprint(company_response_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(company_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(admin_dashboard_bp)
    app.register_blueprint(admin_comment_bp)
    app.register_blueprint(admin_logs_bp)

    # Backend health endpoint
    @app.route("/")
    def home():
        return {
            "message": "ConsumerConnect Backend Running",
            "status": "success",
        }

    # Uploaded file endpoint
    @app.route("/uploads/<filename>")
    def uploaded_file(filename):
        return send_from_directory(
            app.config["UPLOAD_FOLDER"],
            filename,
        )

    # Print registered routes for development diagnostics
    if app.debug:
        print("\n===== REGISTERED ROUTES =====")

        for rule in sorted(
            app.url_map.iter_rules(),
            key=lambda route: str(route),
        ):
            print(rule, rule.methods)

        print("=============================\n")

    return app
