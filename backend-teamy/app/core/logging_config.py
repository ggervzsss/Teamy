import logging
import re


class CleanLogFilter(logging.Filter):
    """Logging filter to mask JWT tickets, shorten UUIDs, and strip IP/port noise."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = self.clean_text(record.msg)
        if record.args:
            if isinstance(record.args, tuple):
                record.args = tuple(self.clean_value(arg) for arg in record.args)
            elif isinstance(record.args, dict):
                record.args = {k: self.clean_value(v) for k, v in record.args.items()}
        return True

    @classmethod
    def clean_value(cls, value: object) -> object:
        if isinstance(value, str):
            return cls.clean_text(value)
        return value

    @staticmethod
    def clean_text(text: str) -> str:
        if not text:
            return text
        text = re.sub(r'ticket=[^&\s"]+', "ticket=***", text)
        text = re.sub(r'state=[^&\s"]+', "state=***", text)
        text = re.sub(r'code=[^&\s"]+', "code=***", text)
        text = re.sub(r'scope=[^&\s"]+', "scope=***", text)
        text = re.sub(r'iss=[^&\s"]+', "iss=***", text)
        text = re.sub(r"([a-f0-9]{8})-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}", r"\1...", text)
        text = re.sub(r"^\d+\.\d+\.\d+\.\d+:\d+\s+-\s+", "", text)
        return text


def setup_logging() -> None:
    """Attach CleanLogFilter to uvicorn, uvicorn.access, app, and root loggers."""
    clean_filter = CleanLogFilter()

    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error", "app", "main"):
        log = logging.getLogger(logger_name)
        if not any(isinstance(f, CleanLogFilter) for f in log.filters):
            log.addFilter(clean_filter)
        for handler in log.handlers:
            if not any(isinstance(f, CleanLogFilter) for f in handler.filters):
                handler.addFilter(clean_filter)

    root = logging.getLogger()
    if not any(isinstance(f, CleanLogFilter) for f in root.filters):
        root.addFilter(clean_filter)
    for handler in root.handlers:
        if not any(isinstance(f, CleanLogFilter) for f in handler.filters):
            handler.addFilter(clean_filter)
