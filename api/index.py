"""Entry point for Vercel's Python runtime.

Vercel's @vercel/python builder looks for an ASGI `app` exported from a file
under api/ -- it does not run the FastAPI app any other way. Everything that
matters lives in app/main.py; this file exists only because Vercel requires
it at this specific path.
"""

from app.main import app  # noqa: F401
