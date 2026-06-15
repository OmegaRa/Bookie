import time
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Tag(db.Model):
    __tablename__ = "tags"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False, unique=True)

    book_tags = db.relationship("BookTag", back_populates="tag", cascade="all, delete-orphan")

    def __init__(self, name=None, **kwargs):
        super().__init__()
        self.name = name
        for k, v in kwargs.items():
            setattr(self, k, v)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            # book_tags is a relationship — use len() so callers can control loading
            # strategy (e.g. subqueryload) instead of firing an extra COUNT per tag.
            "book_count": len(self.book_tags),
        }


class BookTag(db.Model):
    __tablename__ = "book_tags"

    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey("books.id"), nullable=False)
    tag_id = db.Column(db.Integer, db.ForeignKey("tags.id"), nullable=False)

    book = db.relationship("Book", back_populates="book_tags")
    tag = db.relationship("Tag", back_populates="book_tags")

    def __init__(self, book_id=None, tag_id=None, **kwargs):
        super().__init__()
        self.book_id = book_id
        self.tag_id = tag_id
        for k, v in kwargs.items():
            setattr(self, k, v)

    __table_args__ = (
        db.UniqueConstraint("book_id", "tag_id"),
        db.Index("ix_book_tags_book_id", "book_id"),
        db.Index("ix_book_tags_tag_id", "tag_id"),
    )


class Book(db.Model):
    __tablename__ = "books"

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(512), nullable=False, unique=True)
    file_format = db.Column(db.String(16))
    file_size = db.Column(db.Integer)

    # Metadata
    title = db.Column(db.String(512))
    author = db.Column(db.String(512))
    isbn = db.Column(db.String(32))
    isbn13 = db.Column(db.String(32))
    publisher = db.Column(db.String(256))
    published_date = db.Column(db.String(32))
    language = db.Column(db.String(16))
    description = db.Column(db.Text)
    page_count = db.Column(db.Integer)
    categories = db.Column(db.String(512))  # kept for backward compat
    rating = db.Column(db.Float)
    goodreads_id = db.Column(db.String(64))
    series = db.Column(db.String(256))
    series_order = db.Column(db.Float)

    # Cover
    cover_filename = db.Column(db.String(256))

    # Audiobook metadata
    is_audiobook = db.Column(db.Boolean, default=False)
    duration = db.Column(db.Integer)  # Duration in seconds
    narrator = db.Column(db.String(256))  # Audiobook narrator
    audio_format = db.Column(db.String(16))  # mp3, m4b, aac, etc.
    chapters = db.Column(db.Text)  # JSON array of chapter info

    # Progress tracking
    read_status = db.Column(db.String(32), default="unread", nullable=False, server_default="unread")
    progress = db.Column(db.Float, default=0.0, nullable=False, server_default="0.0")
    progress_location = db.Column(db.Text, nullable=True)

    # Timestamps
    date_added = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    date_modified = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relations
    book_tags = db.relationship("BookTag", back_populates="book", cascade="all, delete-orphan", lazy="joined")

    __table_args__ = (
        db.Index("ix_books_title", "title"),
        db.Index("ix_books_author", "author"),
        db.Index("ix_books_file_format", "file_format"),
        db.Index("ix_books_date_added", "date_added"),
        db.Index("ix_books_language", "language"),
        db.Index("ix_books_series", "series"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "file_format": self.file_format,
            "file_size": self.file_size,
            "title": self.title,
            "author": self.author,
            "isbn": self.isbn,
            "isbn13": self.isbn13,
            "publisher": self.publisher,
            "published_date": self.published_date,
            "language": self.language,
            "page_count": self.page_count,
            "rating": self.rating,
            "goodreads_id": self.goodreads_id,
            "cover_filename": self.cover_filename,
            "series": self.series,
            "series_order": self.series_order,
            "is_audiobook": self.is_audiobook,
            "duration": self.duration,
            "narrator": self.narrator,
            "audio_format": self.audio_format,
            "chapters": self.chapters,
            "read_status": self.read_status,
            "progress": self.progress,
            "progress_location": self.progress_location,
            "date_added": self.date_added.isoformat() if self.date_added else None,
            "date_modified": self.date_modified.isoformat() if self.date_modified else None,
            "tags": [bt.tag.name for bt in self.book_tags],
        }


class EmailAddress(db.Model):
    __tablename__ = "email_addresses"

    id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(256), nullable=False)
    is_default = db.Column(db.Boolean, default=False, nullable=False)
    date_added = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __init__(self, label=None, email=None, is_default=False, **kwargs):
        super().__init__()
        self.label = label
        self.email = email
        self.is_default = is_default
        for k, v in kwargs.items():
            setattr(self, k, v)

    def to_dict(self):
        return {
            "id": self.id,
            "label": self.label,
            "email": self.email,
            "is_default": self.is_default,
        }


class Settings(db.Model):
    __tablename__ = "settings"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(128), nullable=False, unique=True)
    value = db.Column(db.Text)

    def __init__(self, key=None, value=None, **kwargs):
        super().__init__()
        self.key = key
        self.value = value
        for k, v in kwargs.items():
            setattr(self, k, v)

    _cache: dict = {}
    _cache_ttl: float = 30.0  # seconds

    @classmethod
    def get(cls, key, default=None):
        entry = cls._cache.get(key)
        if entry is not None and time.monotonic() - entry[1] < cls._cache_ttl:
            return entry[0]
        row = cls.query.filter_by(key=key).first()
        val = row.value if row else default
        cls._cache[key] = (val, time.monotonic())
        return val

    @classmethod
    def set(cls, key, value):
        row = cls.query.filter_by(key=key).first()
        if row:
            row.value = value
        else:
            row = cls(key=key, value=value)
            db.session.add(row)
        db.session.commit()
        cls._cache[key] = (value, time.monotonic())
