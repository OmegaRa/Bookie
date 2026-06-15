import os
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

os.environ["DATA_DIR"] = "data"
from app import create_app
from models import Book

app = create_app()
with app.app_context():
    books = Book.query.all()
    print(f"Total books: {len(books)}")
    for b in books:
        print(f"ID: {b.id} | Title: {b.title} | Author: {b.author} | ISBN: {b.isbn} | ISBN13: {b.isbn13}")
