import asyncio
import sys

from data.workers.prepaid_card_ops_worker import run_worker


if __name__ == "__main__":
    sys.exit(asyncio.run(run_worker()))
