from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_serializer

from app.core.time_utils import utc_isoformat


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("*", when_used="json", check_fields=False)
    def serialize_datetime_fields(self, value: object) -> object:
        return utc_isoformat(value) if isinstance(value, datetime) else value
