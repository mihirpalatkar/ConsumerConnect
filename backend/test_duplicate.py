from app import create_app
from app.ai.duplicate_detector import find_duplicate

app = create_app()

with app.app_context():

    result = find_duplicate("Huge pothole near Dharampeth", "Road is damaged badly.")

    print(result)
