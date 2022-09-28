import json
import sys
import flask
import basic_app as router
app = router.app

def get(path):
    ctx = app.request_context({
        "wsgi.url_scheme": "http",
        "REQUEST_METHOD": "GET",
        "PATH_INFO":   path,
        "wsgi.errors": sys.stderr,
    })
    ctx.push()
    response = app.dispatch_request()
    return response

skip = 1
for r in app.url_map.iter_rules():
    if skip > 0:
        skip -= 1
    else:
        label = r.rule
        try:
            response = app.ensure_sync(get(label))
            contentType = None
            text = None
            filename = 'index' if label == '/' else label
            responseType = type(response)
            if responseType is str:
                contentType = 'text/html'
                filename += 'html'
                text = response
            elif responseType is dict:
                contentType = 'application/json'
                filename += '.json'
                text = json.dumps(response)
            elif responseType is flask.wrappers.Response:
                contentType = response.headers.get('Content-Type')
                sourceFile = response.headers.get('Content-Disposition')
                chunks = list(response.iter_encoded())
                text = ''.join(c.decode('utf-8') for c in chunks)
            else:
                raise TypeError('what"S a ' + responseType)
            print('========== ' + label, responseType)
        except Exception as e:
            print('!!!!!!!!!! ' + label, e)

# other possible headers for flask request_context:
#           "wsgi.version": (1, 0),				(1, 0
#           "wsgi.url_scheme": url_scheme,			'http'
#           "wsgi.input": self.rfile,				{BufferedReader} <_io.BufferedReader name=6>
#           "wsgi.errors": sys.stderr,				{TextIOWrapper} <_io.TextIOWrapper name='<stderr>' mode='w' encoding='utf-8'>
#           "wsgi.multithread": self.server.multithread		{bool} True
#           "wsgi.multiprocess": self.server.multiprocess	{bool} False
#           "wsgi.run_once": False,				{bool} False
#           "werkzeug.socket": self.connection,			{socket} <socket.socket fd=6, family=AddressFamily.AF_INET, type=SocketKind.SOCK_STREAM, proto=0, laddr=('127.0.0.1', 5000), raddr=('127.0.0.1', 34476)>
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
#          'HTTP_USER_AGENT' = {str} 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'
#          'HTTP_ACCEPT' = {str} 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
#          'HTTP_SEC_FETCH_SITE' = {str} 'none'
#          'HTTP_SEC_FETCH_MODE' = {str} 'navigate'
#          'HTTP_SEC_FETCH_USER' = {str} '?1'
#          'HTTP_SEC_FETCH_DEST' = {str} 'document'
#          'HTTP_ACCEPT_ENCODING' = {str} 'gzip, deflate, br'
#          'HTTP_ACCEPT_LANGUAGE' = {str} 'en-US,en;q=0.9'
#          'HTTP_COOKIE' = {str} 'io=_EujwrtKeZ7fCSQeAABs; _ga=GA1.1.442240216.1615845932; __utma=111872281.442240216.1615845932.1634041881.1634041881.1; __utmc=111872281; JSESSIONID=89DE4283716C96948B469C0121E1A9FD; express_sid=s%3Aw3ozB6gwSf01ZCfgzdcXcT3UxdtrduJP.TYszJ0CISPLUxVfZM5TweFB
#          'werkzeug.request' = {Request} <Request 'http://localhost:5000/' [GET]>
