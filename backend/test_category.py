from app.ai.category_classifier import classify_issue

print(
    classify_issue(
        "Huge pothole near Dharampeth",
        "Road damaged badly"
    )
)

print(
    classify_issue(
        "Street lights not working",
        "Area is completely dark"
    )
)

print(
    classify_issue(
        "Garbage lying on road",
        "Waste not collected"
    )
)

print(
    classify_issue(
        "Water leakage near bus stand",
        "Pipeline has burst and water is flowing continuously"
    )
)