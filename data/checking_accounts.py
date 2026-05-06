import asyncio

from data.workers.checking_accounts_worker import run_worker


if __name__ == "__main__":
    asyncio.run(run_worker())
