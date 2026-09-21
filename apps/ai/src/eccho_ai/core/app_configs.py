from eccho_ai.core.variables import AppVars

SWAGGER_CONFIG = {
    "title": "Ecbot AI API",
    "description": "API for Ecbot AI application",
    "version": "1.0.0",
    "docs_url": "/",
    "debug": AppVars.ENV == "development",
}
