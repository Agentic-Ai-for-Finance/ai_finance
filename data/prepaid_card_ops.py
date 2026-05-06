import asyncio

from data.workers.prepaid_card_ops_worker import run_worker


if __name__ == "__main__":
    asyncio.run(run_worker())
