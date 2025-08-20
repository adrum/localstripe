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

import argparse
import base64
import json
import logging
import os
import os.path
import re
import socket

from aiohttp import web

from .resources import BalanceTransaction, Charge, Coupon, Customer, Event, \
    Invoice, InvoiceItem, PaymentIntent, PaymentMethod, Payout, Plan, \
    Price, Product, Refund, SetupIntent, Source, Subscription, SubscriptionItem, \
    TaxRate, Token, extra_apis, store
from .errors import UserError
from .webhooks import register_webhook, _webhook_logs
from .api_logs import create_api_log, get_api_logs, clear_api_logs


def json_response(*args, **kwargs):
    response = web.json_response(
        *args,
        dumps=lambda x: json.dumps(x, indent=2, sort_keys=True) + '\n',
        **kwargs)

    # Store response data for logging if available
    if args and hasattr(response, '_logged_data'):
        response._logged_data = args[0]
    elif args:
        response._logged_data = args[0]

    return response


async def add_cors_headers(request, response):
    origin = request.headers.get('Origin')
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Headers'] = \
            'Content-Type, Accept, Authorization, X-LocalStripe-UI, X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = \
            'GET, POST, PUT, PATCH, DELETE, OPTIONS'


@web.middleware
async def error_middleware(request, handler):
    try:
        return await handler(request)
    except UserError as e:
        return e.to_response()


async def get_post_data(request, remove_auth=True):
    try:
        data = await request.json()
    except json.decoder.JSONDecodeError:
        data = await request.post()
        if data:
            data = unflatten_data(data)

    if data and remove_auth:
        # Remove auth-related properties:
        if 'key' in data:
            del data['key']
        if 'payment_user_agent' in data:
            del data['payment_user_agent']
        if 'referrer' in data:
            del data['referrer']

    return data


# Try to decode values like
#    curl -d card[cvc]=123 -d subscription_items[0][plan]=pro-yearly
def unflatten_data(multidict):
    # Transform `{'attributes[]': 'size', 'attributes[]': 'gender'}` into
    # `{'attributes': ['size', 'gender']}`
    def handle_multiple_keys(multidict):
        data = dict()
        for k in multidict.keys():
            values = multidict.getall(k)
            values = [handle_multiple_keys(v) if hasattr(v, 'keys') else v
                      for v in values]
            if len(k) > 2 and k.endswith('[]'):
                k = k[:-2]
            else:
                values = values[0]
            data[k] = values
        return data

    data = handle_multiple_keys(multidict)

    def make_tree(data):
        for k, v in list(data.items()):
            r = re.search(r'^([^\[]+)\[([^\[]+)\](.*)$', k)
            if r:
                k0 = r.group(1)
                k1 = r.group(2) + r.group(3)
                data[k0] = data.get(k0, {})
                data[k0][k1] = v
                data[k0] = make_tree(data[k0])
                del data[k]
        return data

    data = make_tree(data)

    # Transform `{'items': {'0': {'plan': 'pro-yearly'}}}` into
    # `{'items': [{'plan': 'pro-yearly'}]}`
    def transform_lists(data):
        if (len(data) > 0 and
                all([re.match(r'^[0-9]+$', k) for k in data.keys()])):
            new_data = [(int(k), v) for k, v in data.items()]
            new_data.sort(key=lambda k: int(k[0]))
            data = []
            for k, v in sorted(new_data, key=lambda k: int(k[0])):
                if type(v) is dict:
                    data.append(transform_lists(v))
                else:
                    data.append(v)
            return data
        else:
            for k in data.keys():
                if type(data[k]) is dict:
                    data[k] = transform_lists(data[k])
            return data

    data = transform_lists(data)

    return data


def get_api_key(request):
    header = request.headers.get('Authorization', '').split(' ')
    if len(header) != 2:
        return

    api_key = None
    if header[0] == 'Basic':
        api_key = base64.b64decode(header[1].encode('utf-8')).decode('utf-8')
        api_key = api_key.split(':')[0]
    elif header[0] == 'Bearer':
        api_key = header[1]

    if api_key and api_key.startswith('sk_') and len(api_key) > 5:
        return api_key


@web.middleware
async def auth_middleware(request, handler):
    # Handle OPTIONS preflight requests
    if request.method == 'OPTIONS':
        return web.Response(status=200)

    # Skip authentication for static files and UI routes
    if (
        request.path.startswith('/js.stripe.com/')
        or request.path.startswith('/_config/')
        or request.path == '/'
        or request.path.startswith('/assets/')
        or request.path.endswith(
            ('.js', '.css', '.html', '.svg', '.png', '.jpg', '.ico', '.woff', '.woff2', '.ttf')
        )
    ):
        is_auth = True

    else:
        # There are exceptions (for example POST /v1/tokens, POST /v1/sources)
        # where authentication can be done using the public key (passed as
        # `key` in POST data) instead of the private key.
        accept_key_in_post_data = (
            request.method == 'POST' and
            any(re.match(pattern, request.path) for pattern in (
                r'^/v1/tokens$',
                r'^/v1/sources$',
                r'^/v1/payment_intents/\w+/_authenticate\b',
                r'^/v1/setup_intents/\w+/confirm$',
                r'^/v1/setup_intents/\w+/cancel$',
            )))

        is_auth = get_api_key(request) is not None

        if request.method == 'POST':
            data = await get_post_data(request, remove_auth=False)
        else:
            data = unflatten_data(request.query)

        if not is_auth and accept_key_in_post_data:
            if ('key' in data and type(data['key']) is str and
                    data['key'].startswith('pk_')):
                is_auth = True

    if not is_auth:
        raise UserError(401, 'Unauthorized')

    return await handler(request)


@web.middleware
async def save_store_middleware(request, handler):
    try:
        return await handler(request)
    finally:
        if request.method in ('PUT', 'POST', 'DELETE'):
            store.dump_to_disk()


@web.middleware
async def api_logging_middleware(request, handler):
    """Log all API requests and responses"""
    # Skip logging for UI requests (identified by custom header)
    if request.headers.get('X-LocalStripe-UI') == 'true':
        return await handler(request)

    # Skip logging for internal config endpoints (except api_logs fetching), static files, and UI routes
    if (request.path.startswith('/_config/api_logs') or
            request.path.startswith('/_config/webhooks') or
            request.path.startswith('/_config/data') or
            request.path.startswith('/js.stripe.com/') or
            request.path == '/' or
            request.path.startswith('/assets/') or
            request.path.endswith(('.js', '.css', '.html', '.svg', '.png', '.jpg', '.ico', '.woff', '.woff2', '.ttf'))):
        return await handler(request)

    # Get request data
    query_params = dict(request.query)
    request_body = None

    if request.method in ('POST', 'PUT', 'PATCH'):
        try:
            request_body = await get_post_data(request, remove_auth=False)
        except Exception:
            request_body = None

    # Create log entry
    api_log = create_api_log(
        method=request.method,
        path=request.path,
        query_params=query_params,
        request_body=request_body
    )

    try:
        # Process the request
        response = await handler(request)

        # Capture response body from our custom json_response function
        response_body = getattr(response, '_logged_data', None)

        # Log successful response
        api_log.complete_request(response.status, response_body)

        return response

    except Exception as e:
        # Log exception with detailed information
        import traceback
        error_details = {
            'message': str(e),
            'type': type(e).__name__,
            'traceback': traceback.format_exc()
        }
        api_log.complete_request(500, error=error_details)
        raise


app = web.Application(middlewares=[error_middleware, auth_middleware,
                                   api_logging_middleware, save_store_middleware])
app.on_response_prepare.append(add_cors_headers)


def api_create(cls, url):
    async def f(request):
        data = await get_post_data(request)
        data = data or {}
        expand = data.pop('expand', None)
        return json_response(cls._api_create(**data)._export(expand=expand))
    return f


def api_retrieve(cls, url):
    def f(request):
        id = request.match_info['id']
        data = unflatten_data(request.query)
        expand = data.pop('expand', None)
        return json_response(cls._api_retrieve(id)._export(expand=expand))
    return f


def api_update(cls, url):
    async def f(request):
        id = request.match_info['id']
        data = await get_post_data(request)
        if not data:
            raise UserError(400, 'Bad request')
        expand = data.pop('expand', None)
        return json_response(cls._api_update(id, **data)._export(
            expand=expand))
    return f


def api_delete(cls, url):
    def f(request):
        id = request.match_info['id']
        return json_response(cls._api_delete(id)._export())
    return f


def api_list_all(cls, url):
    def f(request):
        data = unflatten_data(request.query)
        expand = data.pop('expand', None)
        return json_response(cls._api_list_all(url, **data)
                             ._export(expand=expand))
    return f


def api_extra(func, url):
    async def f(request):
        data = await get_post_data(request) or {}
        data.update(unflatten_data(request.query) or {})
        if 'id' in request.match_info:
            data['id'] = request.match_info['id']
        if 'source_id' in request.match_info:
            data['source_id'] = request.match_info['source_id']
        if 'subscription_id' in request.match_info:
            data['subscription_id'] = request.match_info['subscription_id']
        if 'tax_id' in request.match_info:
            data['tax_id'] = request.match_info['tax_id']
        expand = data.pop('expand', None)
        return json_response(func(**data)._export(expand=expand))
    return f


# Extra routes must be added *before* regular routes, because otherwise
# `/invoices/upcoming` would fall into `/invoices/{id}`.
for method, url, func in extra_apis:
    app.router.add_route(method, url, api_extra(func, url))


for cls in (BalanceTransaction, Charge, Coupon, Customer, Event, Invoice,
            InvoiceItem, PaymentIntent, PaymentMethod, Payout, Plan, Price, Product,
            Refund, SetupIntent, Source, Subscription, SubscriptionItem,
            TaxRate, Token):
    for method, url, func in (
            ('POST', '/v1/' + cls.object + 's', api_create),
            ('GET', '/v1/' + cls.object + 's/{id}', api_retrieve),
            ('POST', '/v1/' + cls.object + 's/{id}', api_update),
            ('DELETE', '/v1/' + cls.object + 's/{id}', api_delete),
            ('GET', '/v1/' + cls.object + 's', api_list_all)):
        app.router.add_route(method, url, func(cls, url))


def localstripe_js(request):
    path = os.path.dirname(os.path.realpath(__file__)) + '/localstripe-v3.js'
    with open(path) as f:
        return web.Response(text=f.read(),
                            content_type='application/javascript')


app.router.add_get('/js.stripe.com/v3/', localstripe_js)


async def config_webhook(request):
    id = request.match_info['id']
    data = await get_post_data(request) or {}
    url = data.get('url', None)
    secret = data.get('secret', None)
    events = data.get('events', None)
    if not url or not secret or not url.startswith('http'):
        raise UserError(400, 'Bad request')
    if events is not None and type(events) is not list:
        raise UserError(400, 'Bad request')
    register_webhook(id, url, secret, events)
    return web.Response()


async def flush_store(request):
    store.clear()
    return web.Response()


async def get_webhook_logs(request):
    """Retrieve webhook delivery logs"""
    data = unflatten_data(request.query)
    limit = int(data.get('limit', 50))
    offset = int(data.get('offset', 0))

    # Sort logs by creation time (newest first)
    sorted_logs = sorted(_webhook_logs, key=lambda x: x.created, reverse=True)

    # Apply pagination
    paginated_logs = sorted_logs[offset:offset + limit]

    # Convert to dict format
    logs_data = [log.to_dict() for log in paginated_logs]

    return json_response({
        'object': 'list',
        'data': logs_data,
        'has_more': len(sorted_logs) > offset + limit,
        'total_count': len(sorted_logs)
    })


async def get_webhooks_config(request):
    """Retrieve webhook configurations"""
    from .webhooks import _webhooks
    return json_response(_webhooks)


async def delete_webhook_config(request):
    """Delete a webhook configuration"""
    webhook_id = request.match_info['id']
    from .webhooks import _webhooks

    if webhook_id in _webhooks:
        del _webhooks[webhook_id]
        return web.Response()
    else:
        raise UserError(404, 'Webhook not found')


async def retry_webhook(request):
    """Retry a failed webhook delivery"""
    log_id = request.match_info['log_id']

    # Find the webhook log
    webhook_log = None
    for log in _webhook_logs:
        if log.id == log_id:
            webhook_log = log
            break

    if not webhook_log:
        raise UserError(404, 'Webhook log not found')

    # Find the original event to retry
    try:
        event = Event._api_retrieve(webhook_log.event_id)
        # Schedule a new webhook delivery
        from .webhooks import schedule_webhook
        schedule_webhook(event)
        return web.Response()
    except Exception as e:
        raise UserError(400, f'Failed to retry webhook: {str(e)}')


async def get_api_logs_endpoint(request):
    """Retrieve API logs with optional filtering"""
    data = unflatten_data(request.query)

    # Extract query parameters
    limit = int(data.get('limit', 100))
    offset = int(data.get('offset', 0))
    method = data.get('method', None)
    status_code = int(data.get('status_code')) if 'status_code' in data else None
    object_type = data.get('object_type', None)
    object_id = data.get('object_id', None)

    # Get filtered logs
    logs = get_api_logs(
        limit=limit,
        offset=offset,
        method=method,
        status_code=status_code,
        object_type=object_type,
        object_id=object_id
    )

    return json_response(logs)


async def clear_api_logs_endpoint(request):
    """Clear all API logs"""
    clear_api_logs()
    return web.Response()


# Add all API routes first
app.router.add_post('/_config/webhooks/{id}', config_webhook)
app.router.add_get('/_config/webhooks', get_webhooks_config)
app.router.add_delete('/_config/webhooks/{id}', delete_webhook_config)
app.router.add_get('/_config/webhook_logs', get_webhook_logs)
app.router.add_post('/_config/webhook_logs/{log_id}/retry', retry_webhook)
app.router.add_get('/_config/api_logs', get_api_logs_endpoint)
app.router.add_delete('/_config/api_logs', clear_api_logs_endpoint)
app.router.add_delete('/_config/data', flush_store)


# Static file serving for UI - must be LAST to avoid conflicts
def setup_static_routes():
    static_path = os.environ.get('LOCALSTRIPE_STATIC_PATH')
    print(f'LOCALSTRIPE_STATIC_PATH: {static_path}')

    if not static_path:
        print('✗ LOCALSTRIPE_STATIC_PATH not set')
        return

    if not os.path.exists(static_path):
        print(f'✗ Static path does not exist: {static_path}')
        return

    print(f'Static path exists: {static_path}')
    # List contents of static directory for debugging
    try:
        contents = os.listdir(static_path)
        print(f'Static directory contents: {contents}')
    except Exception as e:
        print(f'Error listing static directory: {e}')

    # Add specific route for index.html at root
    async def serve_index(request):
        index_path = os.path.join(static_path, 'index.html')
        if os.path.exists(index_path):
            return web.FileResponse(index_path)
        raise web.HTTPNotFound()

    # Add route for root path to serve index.html
    app.router.add_get('/', serve_index)

    # Add static file serving for all other static assets
    app.router.add_static('/assets', os.path.join(static_path, 'assets'), name='assets')

    # Add fallback for SPA routing - serve index.html for any unmatched routes
    async def spa_handler(request):
        # Only serve index.html for browser requests (not API calls)
        if (
            not request.path.startswith('/v1/')
            and not request.path.startswith('/_config/')
            and not request.path.startswith('/js.stripe.com/')
        ):
            index_path = os.path.join(static_path, 'index.html')
            if os.path.exists(index_path):
                return web.FileResponse(index_path)
        raise web.HTTPNotFound()

    # Add SPA fallback route last
    app.router.add_route('*', '/{path:.*}', spa_handler)

    print(f'✓ Serving static files from: {static_path}')
    print('✓ SPA routing enabled for React app')


# Setup static file serving AFTER all API routes
setup_static_routes()


def start():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8420)
    parser.add_argument('--from-scratch', action='store_true')
    args = parser.parse_args()

    if not args.from_scratch:
        store.try_load_from_disk()

    # Listen on both IPv4 and IPv6
    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(('::', args.port))

    logger = logging.getLogger('aiohttp.access')
    logger.setLevel(logging.DEBUG)
    logger.addHandler(logging.StreamHandler())

    web.run_app(app, sock=sock, access_log=logger)


if __name__ == '__main__':
    start()
