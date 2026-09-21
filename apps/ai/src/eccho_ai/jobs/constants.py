import os


DEFAULT_HEARTBEAT_INTERVAL = float(os.getenv("HEARTBEAT_INTERVAL", 5.0))  # Interval in seconds for the heartbeat to check for job executions
DEFAULT_DB_QUERY_LIMIT = int(os.getenv("DB_QUERY_LIMIT", 10))  # Limit for jobs querying the database for changes
DEFAULT_SEMAPHORE_LIMIT = int(os.getenv("SEMAPHORE_LIMIT", 10))  # Max concurrent executions of a job