# Copyright 2018 Adrien Vergé
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
import hashlib
import hmac
import json
import logging
import time
import uuid

import aiohttp


_webhooks = {}
_webhook_logs = []


class Webhook(object):
    def __init__(self, url, secret, events, account_id=None):
        self.url = url
        self.secret = secret
        self.events = events
        self.account_id = account_id  # Account that owns this webhook


class WebhookLog(object):
    def __init__(self, webhook_id, event, url, attempt=1, account_id=None):
        self.id = 'whl_' + str(uuid.uuid4()).replace('-', '')[:24]
        self.webhook_id = webhook_id
        self.event_type = event.type
        self.event_id = event.id
        self.url = url
        self.attempt = attempt
        self.created = int(time.time())
        self.request_data = event._export()
        self.response_data = None
        self.status_code = None
        self.response_time_ms = None
        self.error_message = None
        self.retry_at = None
        self.account_id = account_id  # Account that triggered this webhook

    def to_dict(self):
        return {
            'id': self.id,
            'webhook_id': self.webhook_id,
            'event_type': self.event_type,
            'event_id': self.event_id,
            'url': self.url,
            'attempt': self.attempt,
            'created': self.created,
            'request_data': self.request_data,
            'response_data': self.response_data,
            'status_code': self.status_code,
            'response_time_ms': self.response_time_ms,
            'error_message': self.error_message,
            'retry_at': self.retry_at,
            'account_id': self.account_id,
        }


def register_webhook(id, url, secret, events, account_id=None):
    _webhooks[id] = Webhook(url, secret, events, account_id)


async def _send_webhook(event, max_retries=3):
    payload = json.dumps(event._export(), indent=2, sort_keys=True)
    payload = payload.encode('utf-8')
    signed_payload = b'%d.%s' % (event.created, payload)

    await asyncio.sleep(1)

    logger = logging.getLogger('aiohttp.access')

    # Get the event's account ID
    event_account_id = getattr(event, '_account_id', None)

    for webhook_id, webhook in _webhooks.items():
        # Filter by account: only trigger webhooks that belong to the same account
        # or webhooks without an account (legacy/global webhooks)
        if webhook.account_id is not None and event_account_id is not None:
            if webhook.account_id != event_account_id:
                continue

        if webhook.events is not None and event.type not in webhook.events:
            continue

        signature = hmac.new(
            webhook.secret.encode('utf-8'), signed_payload, hashlib.sha256
        ).hexdigest()
        headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Stripe-Signature': 't=%d,v1=%s' % (event.created, signature),
        }

        # Try delivery with retries
        for attempt in range(1, max_retries + 1):
            webhook_log = WebhookLog(
                webhook_id, event, webhook.url, attempt, event_account_id
            )
            _webhook_logs.append(webhook_log)

            start_time = time.time()

            try:
                timeout = aiohttp.ClientTimeout(total=30)  # 30 second timeout
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.post(
                        webhook.url, data=payload, headers=headers
                    ) as r:
                        end_time = time.time()
                        webhook_log.response_time_ms = int(
                            (end_time - start_time) * 1000
                        )
                        webhook_log.status_code = r.status

                        try:
                            response_text = await r.text()
                            if response_text:
                                try:
                                    webhook_log.response_data = json.loads(
                                        response_text
                                    )
                                except json.JSONDecodeError:
                                    webhook_log.response_data = response_text
                            else:
                                webhook_log.response_data = None
                        except Exception:
                            webhook_log.response_data = None

                        if r.status >= 200 and r.status < 300:
                            logger.info(
                                'webhook "%s" successfully delivered to %s (attempt %d)'
                                % (event.type, webhook.url, attempt)
                            )
                            break  # Success, don't retry
                        else:
                            webhook_log.error_message = f'HTTP {r.status}'
                            logger.info(
                                'webhook "%s" failed with response code %d (attempt %d)'
                                % (event.type, r.status, attempt)
                            )

                            if attempt < max_retries:
                                # Schedule retry with exponential backoff
                                retry_delay = 2**attempt  # 2, 4, 8 seconds
                                webhook_log.retry_at = int(
                                    time.time() + retry_delay
                                )
                                await asyncio.sleep(retry_delay)

            except asyncio.TimeoutError:
                end_time = time.time()
                webhook_log.response_time_ms = int(
                    (end_time - start_time) * 1000
                )
                webhook_log.status_code = 0
                webhook_log.error_message = 'Request timeout'
                logger.info(
                    'webhook "%s" timed out (attempt %d)'
                    % (event.type, attempt)
                )

                if attempt < max_retries:
                    retry_delay = 2**attempt
                    webhook_log.retry_at = int(time.time() + retry_delay)
                    await asyncio.sleep(retry_delay)

            except aiohttp.client_exceptions.ClientError as e:
                end_time = time.time()
                webhook_log.response_time_ms = int(
                    (end_time - start_time) * 1000
                )
                webhook_log.status_code = 0
                webhook_log.error_message = str(e)
                logger.info(
                    'webhook "%s" failed: %s (attempt %d)'
                    % (event.type, e, attempt)
                )

                if attempt < max_retries:
                    retry_delay = 2**attempt
                    webhook_log.retry_at = int(time.time() + retry_delay)
                    await asyncio.sleep(retry_delay)

            except Exception as e:
                end_time = time.time()
                webhook_log.response_time_ms = int(
                    (end_time - start_time) * 1000
                )
                webhook_log.status_code = 0
                webhook_log.error_message = f'Unexpected error: {str(e)}'
                logger.error(
                    'webhook "%s" failed with unexpected error: %s (attempt %d)'
                    % (event.type, e, attempt)
                )

                if attempt < max_retries:
                    retry_delay = 2**attempt
                    webhook_log.retry_at = int(time.time() + retry_delay)
                    await asyncio.sleep(retry_delay)


def schedule_webhook(event):
    asyncio.ensure_future(_send_webhook(event))
