from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.services.dashboard_service import (
    get_dashboard_overview,
    get_category_distribution,
    get_severity_distribution,
    get_status_distribution,
    get_monthly_trends,
    get_top_companies,
    get_resolution_statistics,
)

dashboard_bp = Blueprint(
    "dashboard",
    __name__,
    url_prefix="/api/dashboard"
)


@dashboard_bp.route("/overview", methods=["GET"])
@jwt_required()
def overview():
    return jsonify({
        "success": True,
        "data": get_dashboard_overview()
    }), 200


@dashboard_bp.route("/category-distribution", methods=["GET"])
@jwt_required()
def category_distribution():
    return jsonify({
        "success": True,
        "data": get_category_distribution()
    }), 200


@dashboard_bp.route("/severity-distribution", methods=["GET"])
@jwt_required()
def severity_distribution():
    return jsonify({
        "success": True,
        "data": get_severity_distribution()
    }), 200


@dashboard_bp.route("/status-distribution", methods=["GET"])
@jwt_required()
def status_distribution():
    return jsonify({
        "success": True,
        "data": get_status_distribution()
    }), 200


@dashboard_bp.route("/monthly-trends", methods=["GET"])
@jwt_required()
def monthly_trends():
    return jsonify({
        "success": True,
        "data": get_monthly_trends()
    }), 200


@dashboard_bp.route("/top-companies", methods=["GET"])
@jwt_required()
def top_companies():
    return jsonify({
        "success": True,
        "data": get_top_companies()
    }), 200


@dashboard_bp.route("/resolution-statistics", methods=["GET"])
@jwt_required()
def resolution_statistics():
    return jsonify({
        "success": True,
        "data": get_resolution_statistics()
    }), 200