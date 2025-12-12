# Copyright 2025 LocalStripe Contributors
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

import time
import uuid
from collections import deque


# Store last 1000 API logs in memory
_api_logs = deque(maxlen=1000)


class APILog:
    def __init__(self, method, path, query_params=None, request_body=None, account_id=None):
        self.id = 'log_' + str(uuid.uuid4()).replace('-', '')[:24]
        self.method = method
        self.path = path
        self.query_params = query_params or {}
        self.request_body = request_body
        self.response_body = None
        self.status_code = None
        self.duration_ms = None
        self.created = int(time.time())
        self.request_time = time.time()
        self.error = None
        self.object_id = None
        self.object_type = None
        self.account_id = account_id  # Account that made this request

        # Extract object information from path
        self._extract_object_info()

    def _extract_object_info(self):
        """Extract object type and ID from the API path"""
        path_parts = self.path.strip('/').split('/')

        if len(path_parts) >= 2 and path_parts[0] == 'v1':
            # Handle paths like /v1/customers/cus_123
            if len(path_parts) == 3:
                object_type = path_parts[1]
                object_id = path_parts[2]

                # Map plural to singular
                type_map = {
                    'customers': 'customer',
                    'charges': 'charge',
                    'payment_intents': 'payment_intent',
                    'subscriptions': 'subscription',
                    'plans': 'plan',
                    'invoices': 'invoice',
                    'products': 'product',
                    'coupons': 'coupon',
                    'sources': 'source',
                    'tokens': 'token',
                    'events': 'event',
                    'balance_transactions': 'balance_transaction',
                    'payouts': 'payout',
                    'refunds': 'refund',
                    'setup_intents': 'setup_intent',
                    'tax_rates': 'tax_rate',
                    'payment_methods': 'payment_method',
                    'invoice_items': 'invoice_item',
                    'subscription_items': 'subscription_item',
                }

                self.object_type = type_map.get(
                    object_type, object_type.rstrip('s')
                )
                self.object_id = object_id

            # Handle creation paths like /v1/customers (POST)
            elif len(path_parts) == 2 and self.method == 'POST':
                object_type = path_parts[1]
                type_map = {
                    'customers': 'customer',
                    'charges': 'charge',
                    'payment_intents': 'payment_intent',
                    'subscriptions': 'subscription',
                    'plans': 'plan',
                    'invoices': 'invoice',
                    'products': 'product',
                    'coupons': 'coupon',
                    'sources': 'source',
                    'tokens': 'token',
                    'refunds': 'refund',
                    'setup_intents': 'setup_intent',
                    'tax_rates': 'tax_rate',
                    'payment_methods': 'payment_method',
                    'invoice_items': 'invoice_item',
                    'subscription_items': 'subscription_item',
                }
                self.object_type = type_map.get(
                    object_type, object_type.rstrip('s')
                )

    def complete_request(self, status_code, response_body=None, error=None):
        """Complete the API log with response information"""
        self.status_code = status_code
        self.response_body = response_body
        self.error = error
        self.duration_ms = int((time.time() - self.request_time) * 1000)

        # If we created an object, extract its ID from the response
        if (
            self.method == 'POST'
            and self.status_code in (200, 201)
            and response_body
            and isinstance(response_body, dict)
        ):
            if 'id' in response_body:
                self.object_id = response_body['id']
            if 'object' in response_body:
                self.object_type = response_body['object']

    def to_dict(self):
        """Convert the API log to a dictionary"""
        return {
            'id': self.id,
            'method': self.method,
            'path': self.path,
            'query_params': self.query_params,
            'request_body': self.request_body,
            'response_body': self.response_body,
            'status_code': self.status_code,
            'duration_ms': self.duration_ms,
            'created': self.created,
            'error': self.error,
            'object_id': self.object_id,
            'object_type': self.object_type,
            'account_id': self.account_id,
        }


def create_api_log(method, path, query_params=None, request_body=None, account_id=None):
    """Create a new API log entry"""
    log = APILog(method, path, query_params, request_body, account_id)
    _api_logs.append(log)
    return log


def get_api_logs(
    limit=100,
    offset=0,
    method=None,
    status_code=None,
    object_type=None,
    object_id=None,
    account_id=None,
):
    """Retrieve API logs with optional filtering"""
    # Convert deque to list for filtering
    logs = list(_api_logs)

    # Apply filters
    if method:
        logs = [log for log in logs if log.method == method]
    if status_code:
        logs = [log for log in logs if log.status_code == status_code]
    if object_type:
        logs = [log for log in logs if log.object_type == object_type]
    if object_id:
        logs = [log for log in logs if log.object_id == object_id]
    if account_id:
        # Filter by account - show logs for this account or logs without account (legacy)
        logs = [
            log for log in logs
            if log.account_id is None or log.account_id == account_id
        ]

    # Sort by creation time (newest first)
    logs.sort(key=lambda x: x.created, reverse=True)

    # Apply pagination
    total_count = len(logs)
    logs = logs[offset : offset + limit]

    return {
        'object': 'list',
        'data': [log.to_dict() for log in logs],
        'has_more': total_count > offset + limit,
        'total_count': total_count,
    }


def clear_api_logs(account_id=None):
    """Clear API logs, optionally only for a specific account"""
    global _api_logs
    if account_id:
        # Filter out logs belonging to this account, keep others
        _api_logs = deque(
            (log for log in _api_logs if log.account_id != account_id),
            maxlen=1000
        )
    else:
        _api_logs.clear()
