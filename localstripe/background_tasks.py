# Copyright 2017 Adrien Vergé
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import asyncio
import logging
import time
from typing import Callable, List, Optional

logger = logging.getLogger('localstripe.background_tasks')


class BackgroundTaskScheduler:
    """
    A simple background task scheduler for LocalStripe.

    Runs periodic tasks like:
    - Finalizing invoices at billing period end
    - Processing metered usage for subscriptions
    - Generating invoices for metered billing
    """

    def __init__(self):
        self._tasks: List[dict] = []
        self._running = False
        self._loop_task: Optional[asyncio.Task] = None
        self._interval = 60  # Check every 60 seconds by default

    def register_task(
        self,
        name: str,
        callback: Callable,
        interval_seconds: int = 60,
    ):
        """
        Register a periodic task.

        Args:
            name: Task name for logging
            callback: Async function to call
            interval_seconds: How often to run the task
        """
        self._tasks.append({
            'name': name,
            'callback': callback,
            'interval': interval_seconds,
            'last_run': 0,
        })
        logger.info(f'Registered background task: {name}')

    async def start(self):
        """Start the background task scheduler."""
        if self._running:
            return

        self._running = True
        self._loop_task = asyncio.create_task(self._run_loop())
        logger.info('Background task scheduler started')

    async def stop(self):
        """Stop the background task scheduler."""
        self._running = False
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass
        logger.info('Background task scheduler stopped')

    async def _run_loop(self):
        """Main loop that checks and runs tasks."""
        while self._running:
            current_time = time.time()

            for task in self._tasks:
                if current_time - task['last_run'] >= task['interval']:
                    try:
                        logger.debug(f"Running task: {task['name']}")
                        await task['callback']()
                        task['last_run'] = current_time
                    except Exception as e:
                        logger.error(
                            f"Error in background task {task['name']}: {e}"
                        )

            await asyncio.sleep(self._interval)


# Global scheduler instance
scheduler = BackgroundTaskScheduler()


async def process_metered_billing():
    """
    Process metered billing for active subscriptions.

    This task:
    1. Finds subscriptions with metered billing
    2. Checks if billing period has ended
    3. Creates invoice items from meter event summaries
    4. Generates invoices for the ended period
    """
    from .resources import (
        store,
        Price,
        set_current_account_id,
    )

    current_time = int(time.time())

    # Find all subscriptions that may need billing
    for key, value in list(store.items()):
        if not key.startswith('subscription:'):
            continue

        sub = value
        if sub.status not in ('active', 'trialing'):
            continue

        # Check if billing period has ended
        if sub.current_period_end > current_time:
            continue

        # Set account context for this subscription
        account_id = getattr(sub, '_account_id', None)
        set_current_account_id(account_id)

        try:
            # Check if subscription has metered items
            has_metered = False
            for item in sub.items._list:
                if hasattr(item, 'price') and item.price:
                    price = Price._api_retrieve(item.price)
                    if price.recurring and price.recurring.get('usage_type') == 'metered':
                        has_metered = True
                        break

            if has_metered:
                # Process metered usage and create invoice items
                await _process_subscription_metered_usage(sub, current_time)

        except Exception as e:
            logger.error(f"Error processing subscription {sub.id}: {e}")
        finally:
            set_current_account_id(None)


async def _process_subscription_metered_usage(sub, current_time):
    """
    Process metered usage for a specific subscription.
    """
    from .resources import (
        store,
        BillingMeter,
        BillingMeterEvent,
        InvoiceItem,
        Price,
        _object_belongs_to_account,
        get_current_account_id,
    )

    account_id = get_current_account_id()
    period_start = sub.current_period_start
    period_end = sub.current_period_end

    # Find metered items in subscription
    for item in sub.items._list:
        if not hasattr(item, 'price') or not item.price:
            continue

        price = Price._api_retrieve(item.price)
        if not price.recurring or price.recurring.get('usage_type') != 'metered':
            continue

        # Find meter events for this subscription item's meter
        # The meter is associated via the price's meter property
        meter_id = getattr(price, 'meter', None)
        if not meter_id:
            continue

        # Get meter to find customer mapping
        try:
            meter = BillingMeter._api_retrieve(meter_id)
        except Exception:
            continue

        # Calculate usage from meter events
        events = [
            value
            for key, value in store.items()
            if key.startswith(BillingMeterEvent.object + ':')
            and _object_belongs_to_account(value, account_id)
            and value.meter == meter_id
            and value._customer == sub.customer
            and value.timestamp >= period_start
            and value.timestamp < period_end
        ]

        if not events:
            continue

        # Aggregate based on meter formula
        if meter.default_aggregation['formula'] == 'sum':
            total_usage = sum(e._value for e in events)
        else:  # count
            total_usage = len(events)

        if total_usage <= 0:
            continue

        # Calculate amount based on price
        if price.unit_amount:
            amount = int(total_usage * price.unit_amount)
        else:
            amount = int(total_usage * 100)  # Default $1 per unit

        # Create invoice item for the metered usage
        InvoiceItem(
            customer=sub.customer,
            subscription=sub.id,
            amount=amount,
            currency=price.currency or 'usd',
            description=f"Metered usage: {meter.display_name} ({total_usage} units)",
            period={
                'start': period_start,
                'end': period_end,
            },
        )

        logger.info(
            f"Created invoice item for subscription {sub.id}: "
            f"{total_usage} units of {meter.display_name}"
        )


async def finalize_pending_invoices():
    """
    Finalize invoices that are due.

    This task looks for draft invoices that should be finalized
    based on their due date or subscription billing cycle.
    """
    from .resources import (
        store,
        set_current_account_id,
    )

    current_time = int(time.time())

    for key, value in list(store.items()):
        if not key.startswith('invoice:'):
            continue

        invoice = value
        if invoice.status != 'draft':
            continue

        # Skip if no subscription (manual invoices)
        if not invoice.subscription:
            continue

        # Set account context
        account_id = getattr(invoice, '_account_id', None)
        set_current_account_id(account_id)

        try:
            # Check if invoice should be finalized
            # (e.g., subscription period has ended)
            if invoice.period_end and invoice.period_end <= current_time:
                invoice._finalize()
                logger.info(f"Finalized invoice {invoice.id}")
        except Exception as e:
            logger.error(f"Error finalizing invoice {invoice.id}: {e}")
        finally:
            set_current_account_id(None)


def register_default_tasks():
    """Register the default background tasks."""
    scheduler.register_task(
        name='process_metered_billing',
        callback=process_metered_billing,
        interval_seconds=60,  # Check every minute
    )
    scheduler.register_task(
        name='finalize_pending_invoices',
        callback=finalize_pending_invoices,
        interval_seconds=30,  # Check every 30 seconds
    )
