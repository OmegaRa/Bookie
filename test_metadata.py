import os
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

os.environ["DATA_DIR"] = "data"
from app import create_app
from models import Book
import scraper

app = create_app()
with app.app_context():
    books = Book.query.all()
    for b in books:
        query = b.isbn13 or b.isbn or f"{b.title} {b.author}"
        print(f"\nTesting metadata fetch for book ID {b.id} with query: '{query}'")
        try:
            results = scraper.search_all_sources(query)
            print(f"Success! Found {len(results)} results.")
            if results:
                print(f"First result title: {results[0].get('title')}, author: {results[0].get('author')}")
        except Exception as exc:
            import traceback
            print("ERROR! Exception raised:")
            traceback.print_exc()
