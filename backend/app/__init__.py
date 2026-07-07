from flask_migrate import Migrate
from flask import Flask

from config import Config
from app.extensions import db
migrate = Migrate()
from app.models import User
from app.routes.auth import auth_bp

def create_app():
    app = Flask(__name__)

    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)

    app.register_blueprint(auth_bp)

    @app.route("/")
    def home():
        return {
            "message": "ConsumerConnect Backend Running",
            "status": "success"
        }

    return app