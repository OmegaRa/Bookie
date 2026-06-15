<img width="98" alt="bookie-icon" src="https://github.com/user-attachments/assets/46af76cc-8014-45b0-a664-97f09afd224a" />

# Bookie+

A self-hosted ebook manager built for simplicity. Organize your library, fetch metadata, and send books directly to your eReader.

I have added the ability to host audiobooks, and the ability to listen to audiobooks and read the ebooks from the interface.

[![Discord](https://img.shields.io/discord/1408095311661891796?label=Discord&logo=discord&style=for-the-badge)](https://discord.gg/CrsSPrBwsC)

> This project is built with Claude and Gemini. 

<img width="100%" alt="Bookie+ UI" src="https://github.com/user-attachments/assets/e0755ecb-c6f7-4ed3-b57e-337dd64876e7" />

---

## Features

**Library Management**
- Multi-format support:
  - Ebooks/Documents: EPUB, PDF, MOBI, AZW, AZW3, FB2, DJVU, CBZ, CBR, and TXT
  - Audiobooks: MP3, M4B, M4A, AAC, FLAC, OGG, WMA, and OPUS
- Automatic metadata fetching from Open Library, Apple Books, and Goodreads
- Cover extraction, search, and direct embedding into EPUB files
- Series tracking and tagging (think shelves, minus the complexity)

**Organization**
- Configurable file rename schemes and folder structures, plus a button to open the book.

<img width="788" height="521" alt="ebook detail" src="https://github.com/user-attachments/assets/49635d18-0f62-4fe7-bfd6-aa1008de1c3b" />

- Book Reader screen

<img width="866" height="1286" alt="reader page" src="https://github.com/user-attachments/assets/3fbc9248-aa95-4b36-ae25-68405be2d3c5" />

- Audiobook details screen with a listen button.

<img width="774" height="515" alt="audiobook details" src="https://github.com/user-attachments/assets/bfc3d3d1-a823-4e00-95ea-15c09e0902bf" />

- Audiobook Player Screen

<img width="877" height="1277" alt="audiobook player" src="https://github.com/user-attachments/assets/14abf4e5-dbbc-4999-a174-40c2b694d4bd" />



>[!NOTE]
>When migrating from a different solution, it is recommended you import your books into Bookie+ to ensure proper metadata management.

## Docker Compose

```yaml
services:
  bookie:
    container_name: bookie
    image: ghcr.io/OmegaRa/bookie:latest
    ports:
      - "5000:5000"
    volumes:
      - /path/to/config:/app/data
    environment:
      - SESSION_COOKIE_SECURE=false  # Required when accessing over HTTP
    restart: unless-stopped
```

Access the UI at http://localhost:5000

## Companion Apps
- Bookie Reader https://github.com/OmegaRa/Bookie-Reader

## License

MIT
