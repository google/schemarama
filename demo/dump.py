import importlib
import json
import sys
import re
import os
import flask
from typing import Any, Optional, Type

# mapping from media type to file extension
# could populate from first two fields in /etc/mime.types
content_type_to_file_extension = {
    "application/json": ".json",
    "text/html": ".html",
    "text/plain": ".txt",
    "application/octet-stream": ".bin",
}


class OutputFile:
    def __init__(self, rule_label: str, content_type: str, output_filename: str, length: int):
        self.rule_label = rule_label
        self.content_type = content_type
        self.output_filename = output_filename
        self.length = length
    def __str__(self):
        return '%s (%s) => %s (%d chars)' % (
            self.rule_label,
            self.content_type,
            self.output_filename,
            self.length)


class PrintingOutputFile(OutputFile):
    def __init__(self, rule_label: str, content_type: str, output_filename: str, length: int):
        super().__init__(rule_label, content_type, output_filename, length)
        print(self)


def pickle_flask(flask_app: flask.Flask, output_dir: Optional[str], skip_rules: int = 1, **kwargs) -> list[OutputFile]:
    report_class = kwargs.get("report_class") if "report_class" in kwargs else OutputFile
    ret: list[OutputFile] = []
    if output_dir:
        replace_directory(output_dir)
    for r in flask_app.url_map.iter_rules():
        if skip_rules > 0:
            skip_rules -= 1
        else:
            rule_label = r.rule
            response_type: Optional[Type] = None
            try:
                response: Any = flask_app.ensure_sync(dispatch_flask_request(flask_app, rule_label))
                content_type: Optional[str]
                text: Optional[str]
                output_filename: str = 'index' if rule_label == '/' else rule_label[1:]
                response_type: Type = type(response)
                if response_type is str:
                    content_type = 'text/html'
                    output_filename += '.html'
                    text = response
                elif response_type is dict:
                    content_type = 'application/json'
                    output_filename += '.json'
                    text = json.dumps(response)
                elif response_type is flask.wrappers.Response:
                    content_type = response.headers.get('Content-Type')
                    if content_type and ';' in content_type:
                        first_parameter = content_type.index(';')
                        content_type = content_type[:first_parameter]
                    else:
                        content_type = 'application/octet-stream'
                    content_disposition = response.headers.get('Content-Disposition')
                    if content_disposition:
                        match: Optional[re.Match[str]] = re.search(r"inline; filename=(.*?)(?:$|, )",
                                                                   content_disposition)
                        source_file = match.groups()[0]
                        _, ext = os.path.splitext(source_file)
                        output_filename += ext
                    elif content_type in content_type_to_file_extension:
                        output_filename += content_type_to_file_extension[content_type]
                    else:
                        output_filename += '.txt'
                    chunks: list[bytes] = list(response.iter_encoded())
                    text = ''.join(c.decode('utf-8') for c in chunks)
                else:
                    raise TypeError("unknown Flask response type `%s`" % response_type)
                output_filename = os.path.join(output_dir if output_dir else '???', output_filename)
                if output_dir:
                    dirname = os.path.dirname(output_filename)
                    if not os.path.isdir(dirname):
                        os.makedirs(dirname, exist_ok=True)
                    with open(output_filename, 'w') as f:
                        f.write(text)
                ret.append(report_class(rule_label, content_type, output_filename, len(text)))
            except Exception as e:
                if response_type:
                    print('! %s: %s from %s' % (rule_label, e, response_type))
                else:
                    print('! %s: %s' % (rule_label, e))
    return ret


def replace_directory(dirname: str) -> None:
    """
    Remove existing directory (and contents) and replace with empty directory
    :param dirname:
    """
    if os.path.isdir(dirname):
        for root, dirs, files in os.walk(dirname, topdown=False):
            for name in files:
                os.remove(os.path.join(root, name))
            for name in dirs:
                os.rmdir(os.path.join(root, name))
        os.rmdir(dirname)
    os.mkdir(dirname)


def dispatch_flask_request(flask_app: flask.Flask, path: str):
    ctx = flask_app.request_context({
        "wsgi.url_scheme": "http",
        "REQUEST_METHOD": "GET",
        "PATH_INFO":   path,
        "wsgi.errors": sys.stderr,
    })
    ctx.push()
    response = flask_app.dispatch_request()
    return response


# dynamically load argv[1], look for .app, and optionally output files in argv[2]
def main(argv: list[str]):
    m = importlib.import_module(argv[1])
    flask_app: flask.app = m.app  # TODO: how do I supply "app" on command line?
    output_dir = argv[2] if len(argv) > 2 else None
    created = pickle_flask(flask_app, output_dir, 1, report_class=PrintingOutputFile)
    print('%screated %d files' % ("" if output_dir else "would have ", len(created)))


if __name__ == '__main__':
    main(sys.argv)


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
#          'HTTP_COOKIE' = {str} 'io=_abcdefg7fCSQeAABs;...
#          'werkzeug.request' = {Request} <Request 'http://localhost:5000/' [GET]>
