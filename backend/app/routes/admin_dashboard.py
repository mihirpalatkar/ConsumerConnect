from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.utils.admin import admin_required
from app.services.admin_dashboard_service import AdminDashboardService

admin_dashboard_bp = Blueprint(
    "admin_dashboard", __name__, url_prefix="/api/admin/dashboard"
)


@admin_dashboard_bp.route("/overview", methods=["GET"])
@jwt_required()
@admin_required
def get_overview():
    return jsonify({"success": True, "data": AdminDashboardService.get_overview()}), 200


@admin_dashboard_bp.route("/users", methods=["GET"])
@jwt_required()
@admin_required
def get_users():
    return (
        jsonify({"success": True, "data": AdminDashboardService.get_user_statistics()}),
        200,
    )


@admin_dashboard_bp.route("/companies", methods=["GET"])
@jwt_required()
@admin_required
def get_companies():
    return (
        jsonify(
            {"success": True, "data": AdminDashboardService.get_company_statistics()}
        ),
        200,
    )


@admin_dashboard_bp.route("/categories", methods=["GET"])
@jwt_required()
@admin_required
def get_categories():
    return (
        jsonify(
            {"success": True, "data": AdminDashboardService.get_category_distribution()}
        ),
        200,
    )


@admin_dashboard_bp.route("/severity", methods=["GET"])
@jwt_required()
@admin_required
def get_severity():
    return (
        jsonify(
            {"success": True, "data": AdminDashboardService.get_severity_distribution()}
        ),
        200,
    )


@admin_dashboard_bp.route("/monthly-trends", methods=["GET"])
@jwt_required()
@admin_required
def get_monthly_trends():
    return (
        jsonify({"success": True, "data": AdminDashboardService.get_monthly_trends()}),
        200,
    )


@admin_dashboard_bp.route("/top-companies", methods=["GET"])
@jwt_required()
@admin_required
def get_top_companies():
    return (
        jsonify({"success": True, "data": AdminDashboardService.get_top_companies()}),
        200,
    )
