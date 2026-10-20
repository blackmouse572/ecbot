import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

from eccho_ai.core.variables import AppVars


def init_sentry(**options) -> bool:
    """Start Sentry when SENTRY_DSN is set (#87). Returns whether it started.

    Logs never reach Sentry, not even as breadcrumbs: the request log
    carries a preview of the customer's chat. Errors arrive through explicit
    `sentry_sdk.capture_exception` calls and unhandled exceptions (including
    an `HTTPException` with a 5xx status), so a 4xx or an expected retry
    logged at error level opens no issue.
    """
    if not AppVars.SENTRY_DSN:
        return False

    sentry_sdk.init(
        dsn=AppVars.SENTRY_DSN,
        environment=AppVars.ENV,
        # Chat requests carry customer messages: no request bodies, headers or
        # IPs (send_default_pii) and no log breadcrumbs (level=None below).
        send_default_pii=False,
        traces_sample_rate=0.0,
        integrations=[LoggingIntegration(level=None, event_level=None)],
        **options,
    )
    # One Sentry project serves api and ai; filter by this tag.
    sentry_sdk.set_tag("service", "ai")
    return True
