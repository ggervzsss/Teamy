from typing import Literal

TaskStatus = Literal["todo", "in_progress", "for_review", "done"]
AssigneeStatus = Literal["todo", "in_progress", "ready_for_review"]
PersonalTaskKind = Literal["task", "ticket", "note"]
FileResourceKind = Literal["doc", "link"]
