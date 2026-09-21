import logging
import sys
import structlog
from structlog.types import EventDict, WrappedLogger

from eccho_ai.core.variables import AppVars


def _add_log_level(logger: WrappedLogger, method: str, event_dict: EventDict) -> EventDict:
    """Inject the log level string into every event."""
    event_dict["level"] = method.upper()
    return event_dict


def _drop_color_message_key(logger: WrappedLogger, method: str, event_dict: EventDict) -> EventDict:
    """Remove uvicorn's 'color_message' if present — noise in JSON output."""
    event_dict.pop("color_message", None)
    return event_dict


def configure_logging(log_level: str = "INFO") -> None:
    """
    Call once at Function App startup.
    Configures both structlog and stdlib logging to emit newline-delimited JSON,
    which Azure Monitor ingests natively.
    """
    # Disable uvicorn's default logging
    logging.getLogger("uvicorn.access").handlers.clear()
    logging.getLogger("uvicorn.access").propagate = False
    logging.getLogger("uvicorn.error").handlers.clear()

    shared_processors = [
        structlog.contextvars.merge_contextvars,          # picks up bind_contextvars() fields
        structlog.stdlib.add_logger_name,
        _add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        _drop_color_message_key,
    ]

    structlog.configure(
        processors=shared_processors + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    renderer = (
        structlog.dev.ConsoleRenderer(
            colors=True,
        )
        if AppVars.ENV == "development"
        else structlog.processors.JSONRenderer()
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        # Final renderer — pure JSON for Azure Monitor
        processor=renderer,
        foreign_pre_chain=shared_processors,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level.upper())


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Convenience function to get a structlog logger with the given name."""
    return structlog.get_logger(name)