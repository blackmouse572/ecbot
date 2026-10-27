import logging

import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.utils import BadDsn, Dsn

from eccho_ai.core.variables import AppVars

logger = logging.getLogger(__name__)


def init_sentry(**options) -> bool:
    """Start Sentry when SENTRY_DSN is set (#87). Returns whether it started.

    Logs never reach Sentry, not even as breadcrumbs: the request log
    carries a preview of the customer's chat. Errors arrive through explicit
    `sentry_sdk.capture_exception` calls and unhandled exceptions (including
    an `HTTPException` with a 5xx status), so a 4xx or an expected retry
    logged at error level opens no issue.

    A blank or malformed DSN (e.g. a bad Secret Manager value) is skipped with
    a warning: error tracking must never stop the service from booting.
    """
    dsn = AppVars.SENTRY_DSN.strip()
    if not dsn:
        return False
    try:
        Dsn(dsn)
    except BadDsn as exc:
        logger.warning("SENTRY_DSN is not a valid Sentry DSN (%s); Sentry is off", exc)
        return False

    sentry_sdk.init(
        dsn=dsn,
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
