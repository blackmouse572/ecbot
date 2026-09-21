'''
Jobs entry point to run background tasks.
'''
import asyncio
import logging

from eccho_ai.jobs.constants import DEFAULT_HEARTBEAT_INTERVAL
from eccho_ai.jobs.base import BaseJob
from eccho_ai.jobs.logic.chunking import ChunkingJob


logger = logging.getLogger(__name__)


# ========================================
# Main entry point
# ========================================

async def heartbeat(
    jobs: list[BaseJob],
    interval: float,
) -> None:
    """
    Every `interval` seconds, fire all registered jobs concurrently.
    Each job runs one full tick (fetch + process) then returns.
    The sleep happens AFTER all jobs finish their tick — so a slow
    tick doesn't cause drift/overlap with the next one.
    """
    job_names = [j.__class__.__name__ for j in jobs]
    logger.info(f"heartbeat started — jobs={job_names} interval={interval}s")

    while True:
        results = await asyncio.gather(
            *[job.run() for job in jobs],
            return_exceptions=True,
        )

        for job, result in zip(jobs, results):
            name = job.__class__.__name__
            if isinstance(result, BaseException):
                logger.error(f"[{name}] tick failed: {result}")
            elif result > 0:
                logger.info(f"[{name}] processed {result} record(s)")

        await asyncio.sleep(interval)


async def main():
    jobs: list[BaseJob] = [
        ChunkingJob(),
    ]
    await heartbeat(jobs, interval=DEFAULT_HEARTBEAT_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
