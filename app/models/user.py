"""
User model re-export for backwards and modular compatibility.
The canonical definition resides in app.models.tenant.
"""
from app.models.tenant import User

__all__ = ["User"]
