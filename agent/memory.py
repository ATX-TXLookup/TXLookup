"""
Task memory — stores task state, context, and history.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime


class TaskMemory:
    """
    In-memory task state manager.
    TODO: Codex — swap to Supabase for persistence.
    """

    def __init__(self):
        self.tasks: Dict[str, Dict[str, Any]] = {}

    async def create_task(self, task_id: str, goal: str) -> Dict[str, Any]:
        """Create a new task record."""
        task = {
            "task_id": task_id,
            "goal": goal,
            "status": "created",
            "phase": "reasoning",
            "steps": [],
            "results": [],
            "artifacts": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        self.tasks[task_id] = task
        return task

    async def update_task(self, task_id: str, updates: Dict[str, Any]) -> Optional[Dict]:
        """Update a task's fields."""
        if task_id not in self.tasks:
            return None
        self.tasks[task_id].update(updates)
        self.tasks[task_id]["updated_at"] = datetime.now().isoformat()
        return self.tasks[task_id]

    async def get_task(self, task_id: str) -> Optional[Dict]:
        """Get a task by ID."""
        return self.tasks.get(task_id)

    async def list_tasks(self) -> List[Dict]:
        """List all tasks."""
        return list(self.tasks.values())
