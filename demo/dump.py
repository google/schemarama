import json
import sys
import re
import os
import flask

# mapping from media type to file extension
# could populate from first two fields in /etc/mime.types
content_type_to_file_extension = {
    "application/json": ".json",
    "text/html": ".html",
    "text/plain": ".txt",
    "application/octet-stream": ".bin",
}


def pickle_flask(flask_app, output_dir, skip_rules=1):
    if output_dir:
        replace_directory(output_dir)
    for r in flask_app.url_map.iter_rules():
        if skip_rules > 0:
            skip_rules -= 1
        else:
            label = r.rule
            response_type = None
            try:
                response = flask_app.ensure_sync(dispatch_flask_request(flask_app, label))
                content_type = None
                text = None
                filename = 'index' if label == '/' else label[1:]
                response_type = type(response)
                if response_type is str:
                    content_type = 'text/html'
                    filename += '.html'
                    text = response
                elif response_type is dict:
                    content_type = 'application/json'
                    filename += '.json'
                    text = json.dumps(response)
                elif response_type is flask.wrappers.Response:
                    xx = response.headers.get('Content-Typexx')
                    content_type = response.headers.get('Content-Type')
                    if content_type and ';' in content_type:
                        first_parameter = content_type.index(';')
                        content_type = content_type[:first_parameter]
                    else:
                        content_type = 'application/octet-stream'
                    content_disposition = response.headers.get('Content-Disposition')
                    if content_disposition:
                        match = re.search(r"inline; filename=(.*?)(?:$|, )", content_disposition)
                        source_file = match.groups()[0]
                        _, ext = os.path.splitext(source_file)
                        filename += ext
                    elif content_type in content_type_to_file_extension:
                        filename += content_type_to_file_extension[content_type]
                    else:
                        filename += '.txt'
                    chunks = list(response.iter_encoded())
                    text = ''.join(c.decode('utf-8') for c in chunks)
                else:
                    raise TypeError('what"S a ' + response_type)
                filename = os.path.join(output_dir if output_dir else '???', filename)
                if output_dir:
                    dirname = os.path.dirname(filename)
                    if not os.path.isdir(dirname):
                        os.makedirs(dirname, exist_ok=True)
                    with open(filename, 'w') as f:
                        f.write(text)
                print('%s (%s) => %s (%d chars)' % (label, content_type, filename, len(text)))
            except Exception as e:
                if response_type:
                    print('! %s: %s from %s' % (label, e, response_type))
                else:
                    print('! %s: %s' % (label, e))


def replace_directory(dirname):
    if os.path.isdir(dirname):
        for root, dirs, files in os.walk(dirname, topdown=False):
            for name in files:
                os.remove(os.path.join(root, name))
            for name in dirs:
                os.rmdir(os.path.join(root, name))
        os.rmdir(dirname)
    os.mkdir(dirname)


def dispatch_flask_request(flask_app, path):
    ctx = flask_app.request_context({
        "wsgi.url_scheme": "http",
        "REQUEST_METHOD": "GET",
        "PATH_INFO":   path,
        "wsgi.errors": sys.stderr,
    })
    ctx.push()
    response = flask_app.dispatch_request()
    return response


if __name__ == '__main__':
    import basic_app as router

    pickle_flask(router.app, sys.argv[1] if len(sys.argv) > 1 else None, 1)


# other possible headers for flask request_context:
#           "wsgi.version": (1, 0),				(1, 0
#           "wsgi.url_scheme": url_scheme,			'http'
#           "wsgi.input": self.rfile,				{BufferedReader} <_io.BufferedReader name=6>
#           "wsgi.errors": sys.stderr,				{TextIOWrapper} <_io.TextIOWrapper name='<stderr>' mode='w' encoding='utf-8'>
#           "wsgi.multithread": self.server.multithread		{bool} True
#           "wsgi.multiprocess": self.server.multiprocess	{bool} False
#           "wsgi.run_once": False,				{bool} False
#           "werkzeug.socket": self.connection,			{socket} <socket.socket>
#           "SERVER_SOFTWARE": self.server_version		{str} 'Werkzeug/2.2.2'
#           "REQUEST_METHOD": self.command,			{str} 'GET'
#           "SCRIPT_NAME": "",					{str} ''
#           "PATH_INFO": _wsgi_encoding_dance(path_info)	{str} '/'
#           "QUERY_STRING": _wsgi_encoding_dance(request_url.query)	{str} ''
#           # Non-standard, added by mod_wsgi, uWSGI
#           "REQUEST_URI": _wsgi_encoding_dance(self.path)	{str} '/'
#           # Non-standard, added by gunicorn
#           "RAW_URI": _wsgi_encoding_dance(self.path)		{str} '/'
#           "REMOTE_ADDR": self.address_string(),		{str} '127.0.0.1'
#           "REMOTE_PORT": self.port_integer(),			{int} 34476
#           "SERVER_NAME": self.server.server_address[0],	{str} '127.0.0.1'
#           "SERVER_PORT": str(self.server.server_address[1]),	{str} '5000'
#           "SERVER_PROTOCOL": self.request_version,		{str} 'HTTP/1.1'
#          'HTTP_HOST' = {str} 'localhost:5000'
#          'HTTP_CONNECTION' = {str} 'keep-alive'
#          'HTTP_SEC_CH_UA' = {str} '"Chromium";v="105", "Not)A;Brand";v="8"'
#          'HTTP_SEC_CH_UA_MOBILE' = {str} '?0'
#          'HTTP_SEC_CH_UA_PLATFORM' = {str} '"Linux"'
#          'HTTP_UPGRADE_INSECURE_REQUESTS' = {str} '1'
#          'HTTP_USER_AGENT' = {str} 'Mozilla/5.0 (X11; Linux x86_64) ...'
#          'HTTP_ACCEPT' = {str} 'text/html,application/xhtml+xml,...'
#          'HTTP_SEC_FETCH_SITE' = {str} 'none'
#          'HTTP_SEC_FETCH_MODE' = {str} 'navigate'
#          'HTTP_SEC_FETCH_USER' = {str} '?1'
#          'HTTP_SEC_FETCH_DEST' = {str} 'document'
#          'HTTP_ACCEPT_ENCODING' = {str} 'gzip, deflate, br'
#          'HTTP_ACCEPT_LANGUAGE' = {str} 'en-US,en;q=0.9'
#          'HTTP_COOKIE' = {str} 'io=_EujwrtKeZ7fCSQeAABs;...
#          'werkzeug.request' = {Request} <Request 'http://localhost:5000/' [GET]>
