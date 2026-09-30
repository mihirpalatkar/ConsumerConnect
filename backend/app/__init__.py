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

    app.config.from_object(Config)

    # Ensure uploads folder exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)

    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                ]
            }
        },
    )

    migrate.init_app(app, db)

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

    @app.route("/")
    def home():
        return {
            "message": "ConsumerConnect Backend Running",
            "status": "success",
        }

    @app.route("/uploads/<filename>")
    def uploaded_file(filename):
        return send_from_directory(
            app.config["UPLOAD_FOLDER"],
            filename,
        )

    print("\n===== REGISTERED ROUTES =====")
    for rule in sorted(app.url_map.iter_rules(), key=lambda r: str(r)):
        print(rule, rule.methods)
    print("=============================\n")

    return app