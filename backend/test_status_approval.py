from app import create_app
from app.extensions import db
from app.models.issue import Issue
from app.models.company_status_request import CompanyStatusRequest
from flask_jwt_extended import create_access_token


app = create_app()


with app.app_context():

    issue = db.session.get(
        Issue,
        18,
    )

    if issue is None:
        print("ERROR: Issue 18 not found.")
        raise SystemExit(1)

    print("========================================")
    print("COMPANY STATUS APPROVAL WORKFLOW TEST")
    print("========================================")

    print("\nINITIAL STATE")
    print("Issue ID:", issue.id)
    print("Issue title:", issue.title)
    print("Issue status:", issue.status)

    if issue.status != "Open":
        print(
            "\nERROR: Issue 18 must start as Open."
        )
        raise SystemExit(1)

    company_token = create_access_token(
        identity="company:9"
    )

    admin_token = create_access_token(
        identity="2",
        additional_claims={
            "role": "Admin"
        },
    )

    client = app.test_client()

    # ========================================================
    # STEP 1
    # COMPANY REQUESTS IN PROGRESS
    # ========================================================

    response = client.patch(
        "/api/company/issues/18/status",
        json={
            "status": "In Progress",
            "resolution_note": (
                "Testing admin approval workflow."
            ),
        },
        headers={
            "Authorization": f"Bearer {company_token}"
        },
    )

    print("\nSTEP 1 - COMPANY REQUESTS IN PROGRESS")
    print("HTTP:", response.status_code)
    print("JSON:", response.get_json())

    data = response.get_json()

    if response.status_code != 201:
        print(
            "\nERROR: Company status request failed."
        )
        raise SystemExit(1)

    status_request = data.get(
        "status_request"
    )

    if not status_request:
        print(
            "\nERROR: Status request was not returned."
        )
        raise SystemExit(1)

    request_id = status_request["id"]

    db.session.expire_all()

    issue = db.session.get(
        Issue,
        18,
    )

    print(
        "\nIssue status after company request:",
        issue.status,
    )

    if issue.status != "Open":
        print(
            "\nERROR: Issue changed before admin approval."
        )
        raise SystemExit(1)

    # ========================================================
    # STEP 2
    # ADMIN APPROVES IN PROGRESS
    # ========================================================

    response = client.patch(
        f"/api/admin/status-requests/{request_id}/approve",
        json={
            "review_note": (
                "Approved during backend workflow testing."
            ),
        },
        headers={
            "Authorization": f"Bearer {admin_token}"
        },
    )

    print("\nSTEP 2 - ADMIN APPROVES")
    print("HTTP:", response.status_code)
    print("JSON:", response.get_json())

    if response.status_code != 200:
        print(
            "\nERROR: Admin approval failed."
        )
        raise SystemExit(1)

    db.session.expire_all()

    issue = db.session.get(
        Issue,
        18,
    )

    first_request = db.session.get(
        CompanyStatusRequest,
        request_id,
    )

    print(
        "\nIssue status after approval:",
        issue.status,
    )

    print(
        "First request status:",
        first_request.status,
    )

    if issue.status != "In Progress":
        print(
            "\nERROR: Issue was not changed to In Progress."
        )
        raise SystemExit(1)

    if first_request.status != "Approved":
        print(
            "\nERROR: Request was not marked Approved."
        )
        raise SystemExit(1)

    # ========================================================
    # STEP 3
    # COMPANY REQUESTS OPEN
    # ========================================================

    response = client.patch(
        "/api/company/issues/18/status",
        json={
            "status": "Open",
        },
        headers={
            "Authorization": f"Bearer {company_token}"
        },
    )

    print("\nSTEP 3 - COMPANY REQUESTS OPEN")
    print("HTTP:", response.status_code)
    print("JSON:", response.get_json())

    data = response.get_json()

    if response.status_code != 201:
        print(
            "\nERROR: Second company status request failed."
        )
        raise SystemExit(1)

    second_status_request = data.get(
        "status_request"
    )

    if not second_status_request:
        print(
            "\nERROR: Second status request was not returned."
        )
        raise SystemExit(1)

    second_request_id = (
        second_status_request["id"]
    )

    db.session.expire_all()

    issue = db.session.get(
        Issue,
        18,
    )

    print(
        "\nIssue status before second approval:",
        issue.status,
    )

    if issue.status != "In Progress":
        print(
            "\nERROR: Issue changed before second approval."
        )
        raise SystemExit(1)

    # ========================================================
    # STEP 4
    # ADMIN APPROVES OPEN
    # ========================================================

    response = client.patch(
        f"/api/admin/status-requests/{second_request_id}/approve",
        json={
            "review_note": (
                "Restoring original status after testing."
            ),
        },
        headers={
            "Authorization": f"Bearer {admin_token}"
        },
    )

    print("\nSTEP 4 - ADMIN APPROVES OPEN")
    print("HTTP:", response.status_code)
    print("JSON:", response.get_json())

    if response.status_code != 200:
        print(
            "\nERROR: Second admin approval failed."
        )
        raise SystemExit(1)

    # ========================================================
    # FINAL VERIFICATION
    # ========================================================

    db.session.expire_all()

    issue = db.session.get(
        Issue,
        18,
    )

    first_request = db.session.get(
        CompanyStatusRequest,
        request_id,
    )

    second_request = db.session.get(
        CompanyStatusRequest,
        second_request_id,
    )

    print("\nFINAL DATABASE STATE")
    print(
        "Issue status:",
        issue.status,
    )

    print(
        "First request status:",
        first_request.status,
    )

    print(
        "Second request status:",
        second_request.status,
    )

    if issue.status != "Open":
        print(
            "\nERROR: Issue 18 was not restored to Open."
        )
        raise SystemExit(1)

    if first_request.status != "Approved":
        print(
            "\nERROR: First request was not Approved."
        )
        raise SystemExit(1)

    if second_request.status != "Approved":
        print(
            "\nERROR: Second request was not Approved."
        )
        raise SystemExit(1)

    print("\n========================================")
    print("APPROVAL WORKFLOW TEST PASSED")
    print("========================================")