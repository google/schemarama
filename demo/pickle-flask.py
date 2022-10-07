import argparse
import importlib
import json
import sys
import re
import os
from abc import ABC, abstractmethod
from types import ModuleType

# import logging
# logging.basicConfig(level=logging.DEBUG)
# logger = logging.getLogger(__name__)

import flask
from typing import Any, Optional, Type

from bs4 import BeautifulSoup, ResultSet
from flask.ctx import RequestContext

# mapping from media type to file extension
# could populate from first two fields in /etc/mime.types
content_type_to_file_extension = {
    'application/json': '.json',
    'text/html': '.html',
    'text/plain': '.txt',
    'application/octet-stream': '.bin',
}
html_attributes_to_update = ['link.href', 'img.src', 'script.src', 'a.href']


class OutputFile:
    """
    Structure used by `pickle_flask` to report created files.
    """
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


class Transformer(ABC):
    FROM = 0
    TO = 1

    def __init__(self, output_files: list[OutputFile]):
        super().__init__()
        self.map_from_to = [x for x in map(
            lambda f: [f.rule_label, f.output_filename],
            output_files
        )]

    @abstractmethod
    def exec(self, text: str) -> str:
        pass


class DomTransformer(Transformer):
    def exec(self, text: str) -> str:
        soup = BeautifulSoup(text, features='lxml')
        for from_to in self.map_from_to:
            for elt_attr in html_attributes_to_update:
                [elt, attr] = elt_attr.split('.')
                matches: ResultSet[Any] = soup.findAll(elt, {attr: from_to[Transformer.FROM]})
                for m in matches:
                    m[attr] = from_to[Transformer.TO]
                    # print(from_to[HtmlTransformer.FROM], m)
        return soup.decode()


class HtmlReTransformer(Transformer):
    def exec(self, text: str) -> str:
        for from_to in self.map_from_to:
            [frum, to] = from_to
            for elt_attr in html_attributes_to_update:
                [elt, attr] = elt_attr.split('.')

                def replace_element(m: Optional[re.Match[str]]):
                    [space, attrs] = m.groups()
                    attrs = re.sub(
                        '(%s\\s*=\\s*[\'"])(%s)([\'"]\\s*)' % (attr, frum),
                        lambda m2: '%s%s%s' % (m2.groups()[0], to, m2.groups()[2]),
                        attrs
                    )
                    return '<%s%s%s>' % (elt, space, attrs)

                text = re.sub('<%s(\\s*)((?:[a-zA-Z0-9]+\\s*=\\s*[\'"].*?[\'"]\\s*)*)>' % elt, replace_element, text)
        return text


class PrintingOutputFile(OutputFile):
    """
    Variant of OutputFile that calls self.__str__
    """
    def __init__(self, rule_label: str, content_type: str, output_filename: str, length: int):
        super().__init__(rule_label, content_type, output_filename, length)
        print(self)


def transform_flask(flask_app: flask.Flask, output_dir: Optional[str], **kwargs) -> list[OutputFile]:
    """
    Construct transformers and call `pickle_flask`
    Don't call transform_flask if you already have your transformers constructed.

    Args:
        flask_app: typical Flask app
        output_dir (str): directory where to place the output files
        kwargs:

    Returns:
        list[OutputFile] - record of which files were or would be created.
    """
    rewrite_run_opts = dict(**kwargs)
    if 'transformer_classes' in kwargs:
        # Do a dry run to get the mapped files.
        dry_run_opts = dict(**kwargs)
        dry_run_opts.update(reporter_class=OutputFile, dry_run=True)
        output_files: list[OutputFile] = pickle_flask(flask_app, output_dir, **dry_run_opts)

        # Construct the desired transformer for each of those files.
        t_classes: dict[str, Type[HtmlReTransformer]] = kwargs.get('transformer_classes')
        transformers: dict[str, list[Transformer]] = dict((k, [v(output_files)]) for (k, v) in t_classes.items())

        # Add transformers to the kwargs.
        rewrite_run_opts.update(transformers=transformers)

    # Do a (final) run with possible transformers.
    return pickle_flask(flask_app, output_dir, **rewrite_run_opts)


def pickle_flask(flask_app: flask.Flask, output_dir: Optional[str], **kwargs) -> list[OutputFile]:
    """
    Dump (pickle) a Flask website into  output_dir. If output_dir is not specified, do a dry run.

    Args:
        flask_app: typical Flask app
        output_dir (str): directory where to place the output files
        kwargs:

    Returns:
        list[OutputFile] - record of which files were or would be created.
    """
    reporter_class = kwargs.get('reporter_class') if 'reporter_class' in kwargs else OutputFile
    rules = kwargs.get('rules') \
        if 'rules' in kwargs \
        else list(flask_app.url_map.iter_rules())[1:]  # 1st seems to be a meta rule

    in_place = kwargs.get('in_place') \
        if 'in_place' in kwargs \
        else False

    new_only = kwargs.get('new_only') \
        if 'new_only' in kwargs \
        else False

    dry_run = kwargs.get('dry_run') \
        if not output_dir or 'dry_run' in kwargs \
        else False

    transformers: dict[str, list[Transformer]] = kwargs.get('transformers') if 'transformers' in kwargs else {}

    # Return the OutputFiles we created while traversing rules.
    files_visited: list[OutputFile] = []

    # If output_dir was supplied, empty it out before adding new files.
    if not dry_run and not in_place and not new_only:
        replace_directory(output_dir)

    # Walk the rules in the flask.
    for r in rules:
        rule_label = r.rule
        response_type: Optional[Type] = None

        try:
            # Ask flask to dispatch the rule.
            response: Any = flask_app.ensure_sync(dispatch_flask_request(flask_app, rule_label))

            # When parsing response, populate some metadata.
            media_type: Optional[str]
            text: Optional[str]
            output_filename: str = rule_label[1:] + ('index' if rule_label.endswith('/') else '')

            # Handle Flask rule results (see Flask dispatch return types below):
            response_type: Type = type(response)
            if response_type is str:
                # Assume string response is HTML.
                media_type = 'text/html'
                output_filename += '.html'
                text = response

            elif response_type is dict:
                # Flask serializes dicts as JSON.
                media_type = 'application/json'
                output_filename += '.json'
                text = json.dumps(response)

            elif response_type is flask.wrappers.Response:
                # Rule responded with a Response object.
                media_type = response.headers.get('Content-Type')
                if media_type and ';' in media_type:
                    first_parameter = media_type.index(';')
                    media_type = media_type[:first_parameter]
                else:
                    media_type = 'application/octet-stream'

                # Look for file extension in Content-Disposition
                # filename or guess from Content-Type.
                content_disposition = response.headers.get('Content-Disposition')
                if content_disposition:
                    match: Optional[re.Match[str]] = re.search(r'inline; filename=(.*?)(?:$|, )',
                                                               content_disposition)
                    source_file = match.groups()[0]
                    _, ext = os.path.splitext(source_file)
                    output_filename += ext
                elif media_type in content_type_to_file_extension:
                    output_filename += content_type_to_file_extension[media_type]
                else:
                    output_filename += '.txt'

                # Iterate to collect chunks of response body.
                chunks: list[bytes] = list(response.iter_encoded())
                text = ''.join(c.decode('utf-8') for c in chunks)

            else:
                raise TypeError('unknown Flask response type `%s`' % response_type)

            if media_type in transformers:
                for rw in transformers[media_type]:
                    text = rw.exec(text)

            # Get full path to output filename and optionally write file.
            output_filename = os.path.join(output_dir if output_dir else '???', output_filename)
            if not dry_run:
                dirname = os.path.dirname(output_filename)
                if not os.path.isdir(dirname):
                    os.makedirs(dirname, exist_ok=True)
                if not new_only or not os.path.exists(output_filename):
                    with open(output_filename, 'w') as f:
                        f.write(text)

            # Record that this file was written.
            files_visited.append(reporter_class(rule_label, media_type, output_filename, len(text)))

        except Exception as e:
            if response_type:
                print('! %s: %s from %s' % (rule_label, e, response_type))
            else:
                print('! %s: %s' % (rule_label, e))

    return files_visited


def replace_directory(dirname: str) -> None:
    """
    Remove existing directory (and contents) and replace with empty directory
    :param dirname: str
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
    """
    Call Flask's `dispatch_request` and return response.
    :param flask_app:
    :param path:
    :return:
    """
    ctx: RequestContext = flask_app.request_context({
        'wsgi.url_scheme': 'http',
        'REQUEST_METHOD': 'GET',
        'PATH_INFO':   path,
        'wsgi.errors': sys.stderr,
    })
    ctx.push()
    response = flask_app.dispatch_request()
    return response


def main(argv: list[str]) -> None:
    """
    Parse argv and call pickle_flask
    :param argv: typically a reference to sys.argv
    :return: None
    """

    # Set up command line args
    cli_parser = argparse.ArgumentParser(description='pickle Flask app.')
    cli_parser.add_argument('module_path', type=str,
                            help='path to Flask module')
    cli_parser.add_argument('flask_app_variable', type=str, nargs='?', default='app',
                            help='variable name for flask app')
    cli_parser.add_argument('-o', '--output_dir', type=str, default=None,
                            help='directory to create or replace')
    cli_parser.add_argument('-i','--in-place', action='store_true',
                            help='don\'t erase output_dir')
    cli_parser.add_argument('-n', '--new-only', action='store_true',
                            help='don\'t replace existing files in output_dir')
    cli_parser.add_argument('-e', '--edit-files', action='store_true',
                            help='update files to point to pickled location')
    args = vars(cli_parser.parse_args())

    # Load module
    m: ModuleType = importlib.import_module(steal_arg(args, 'module_path'))  # load the module
    flask_app: flask.app = getattr(m, steal_arg(args, 'flask_app_variable'))  # get module.app

    # Prepare `transform_flask` args
    output_dir = steal_arg(args, 'output_dir')
    args.update(reporter_class=PrintingOutputFile)  # print dirs as they are processed
    if args.get('edit_files'):
        args.update(transformer_classes={'text/html': HtmlReTransformer})  # edit HTML files

    # Execute `transform_flask`
    created = transform_flask(flask_app, output_dir, **args)
    print('%screated %d files' % ('' if output_dir else 'would have ', len(created)))


def steal_arg(args: dict, key: str) -> Any:
    """

    :param args:
    :param key:
    :return:
    """
    if key not in args:
        return None
    ret = args[key]
    del(args[key])
    return ret


def get_help_string(argv: list[str]) -> str:
    """
    Return invocation help text.

    :param argv: typically sys.argv
    :return: help string
    """
    return 'Usage: %s <Flask module> [Flask variable name = \'app\'] [output directory]' % (argv[0])


# 1. dynamically load argv[1],
# 2. look for .app
# 3. optionally output files to directory specified in argv[2]
if __name__ == '__main__':
    if len(sys.argv) == 1:
        print(get_help_string(sys.argv))
    else:
        main(sys.argv)

# Flask dispatch returns:
# M1 = Mapping[str, Union[str, list[str], tuple[str, ...]]]
# S1 = Sequence[tuple[str, Union[str, list[str], tuple[str, ...]]]]
# H1 = Union[Headers, M1, S1]
#
# B1 = Union[
#     Response,
#     str,
#     bytes,
#     list[Any],
#     Mapping[str, Any],
#     Iterator[str],
#     Iterator[bytes]
# ]
#
# Union[
#     Response,
#     str,
#     bytes,
#     list[Any],
#     Mapping[str, Any],
#     Iterator[str],
#     Iterator[bytes],
#     tuple[B1, H1],
#     tuple[B1, int],
#     tuple[B1, int, H1],
#     Callable[[dict[str, Any], StartResponse], Iterable[bytes]]
# ]


# other possible headers for flask request_context:
#           'wsgi.version': (1, 0),				(1, 0
#           'wsgi.url_scheme': url_scheme,			'http'
#           'wsgi.input': self.rfile,				{BufferedReader} <_io.BufferedReader name=6>
#           'wsgi.errors': sys.stderr,				{TextIOWrapper} <_io.TextIOWrapper name='<stderr>' mode='w' encoding='utf-8'>
#           'wsgi.multithread': self.server.multithread		{bool} True
#           'wsgi.multiprocess': self.server.multiprocess	{bool} False
#           'wsgi.run_once': False,				{bool} False
#           'werkzeug.socket': self.connection,			{socket} <socket.socket>
#           'SERVER_SOFTWARE': self.server_version		{str} 'Werkzeug/2.2.2'
#           'REQUEST_METHOD': self.command,			{str} 'GET'
#           'SCRIPT_NAME': '',					{str} ''
#           'PATH_INFO': _wsgi_encoding_dance(path_info)	{str} '/'
#           'QUERY_STRING': _wsgi_encoding_dance(request_url.query)	{str} ''
#           # Non-standard, added by mod_wsgi, uWSGI
#           'REQUEST_URI': _wsgi_encoding_dance(self.path)	{str} '/'
#           # Non-standard, added by gunicorn
#           'RAW_URI': _wsgi_encoding_dance(self.path)		{str} '/'
#           'REMOTE_ADDR': self.address_string(),		{str} '127.0.0.1'
#           'REMOTE_PORT': self.port_integer(),			{int} 34476
#           'SERVER_NAME': self.server.server_address[0],	{str} '127.0.0.1'
#           'SERVER_PORT': str(self.server.server_address[1]),	{str} '5000'
#           'SERVER_PROTOCOL': self.request_version,		{str} 'HTTP/1.1'
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
