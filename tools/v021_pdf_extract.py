"""Deterministic, read-only page locator for v0.21 official annual reports.

It never writes evidence or alters source PDFs.  It surfaces candidate pages only;
the audit workflow must visually verify every accepted table cell against the PDF.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from importlib.metadata import version
from pathlib import Path

from pypdf import PdfReader


def compact(text: str, limit: int = 1_400) -> str:
    return " ".join(text.split())[:limit]


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--term", action="append", required=True)
    args = parser.parse_args()

    raw = args.pdf.read_bytes()
    reader = PdfReader(args.pdf)
    terms = [item.lower() for item in args.term]
    pages = []
    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        matched = [term for term in terms if term in text.lower()]
        if matched:
            pages.append({"pdfPage": index, "matchedTerms": matched, "text": compact(text)})
    print(json.dumps({
        "tool": "pypdf",
        "toolVersion": version("pypdf"),
        "file": str(args.pdf).replace("\\", "/"),
        "sha256": hashlib.sha256(raw).hexdigest().upper(),
        "pageCount": len(reader.pages),
        "matches": pages,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
