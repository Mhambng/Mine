#!/usr/bin/env python3
"""Regroupe Pépin Sprint en un seul fichier HTML autonome.

Utilisation :
    python3 tools/bundle.py            -> écrit dist/pepin-sprint.html
    python3 tools/bundle.py --fragment -> sans <html>/<head>/<body> (pour une page hébergée qui ajoute son propre squelette)

Le script remplace chaque <link rel="stylesheet" href="css/..."> et <script src="js/...">
local par son contenu. Aucune dépendance : uniquement la bibliothèque standard Python.
"""
import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "pepin-sprint"
OUT = Path(__file__).resolve().parent.parent / "dist" / "pepin-sprint.html"


def inline(html: str) -> str:
    def css(m):
        text = (ROOT / m.group(1)).read_text(encoding="utf-8")
        # Les polices sont intégrées en base64 pour que le fichier unique reste autonome
        def font(f):
            data = (ROOT / "css" / f.group(1)).resolve().read_bytes()
            return 'url("data:font/woff2;base64,' + base64.b64encode(data).decode() + '")'
        text = re.sub(r'url\("(\.\./fonts/[^"]+)"\)', font, text)
        return "<style>\n" + text + "</style>"

    def js(m):
        code = (ROOT / m.group(1)).read_text(encoding="utf-8")
        return f"<script>\n// --- {m.group(1)} ---\n{code}</script>"

    html = re.sub(r'<link rel="stylesheet" href="((?:css)/[^"]+)">', css, html)
    html = re.sub(r'<script src="((?:js)/[^"]+)"></script>', js, html)
    return html


def fragment(html: str) -> str:
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    head = re.sub(r"<meta[^>]*>\n?", "", head)
    body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    return head.strip() + "\n" + body.strip() + "\n"


def main():
    html = inline((ROOT / "index.html").read_text(encoding="utf-8"))
    out = OUT
    if "--fragment" in sys.argv:
        html = fragment(html)
        out = OUT.with_name("pepin-sprint.fragment.html")
    if len(sys.argv) > 1 and not sys.argv[-1].startswith("--"):
        out = Path(sys.argv[-1])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"Écrit : {out} ({len(html) // 1024} Ko)")


if __name__ == "__main__":
    main()
