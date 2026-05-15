import asyncio
import sys

from data.workers.checking_accounts_worker import run_worker


if __name__ == "__main__":
    sys.exit(asyncio.run(run_worker()))
