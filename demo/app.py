#  Copyright 2020 Google LLC
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#       https://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

from flask import Flask, render_template, jsonify, send_file, request
from flask_cors import CORS
import chromedriver_binary
from seleniumwire import webdriver
import os
import json

import config

app = Flask(__name__)
CORS(app)


chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("window-size=1024,768")
chrome_options.add_argument("--no-sandbox")

browser = webdriver.Chrome(chrome_options=chrome_options)

@app.route('/')
def demo():
    return render_template('scc.html')


@app.route('/hierarchy')
def services():
    return config.hierarchy


@app.route('/services/map')
def shape_to_service():
    sts_path = os.path.join(os.curdir, 'validation', 'shapeToService.json')
    return send_file(sts_path)


@app.route('/tests')
def tests():
    tests_path = os.path.join(os.curdir, 'validation', 'tests')
    file_paths = [os.path.join(tests_path, file) for file in sorted(list(os.listdir(tests_path)))]
    test_data = [open(file_path).read() for file_path in file_paths]
    return jsonify(tests=test_data)


@app.route('/shex/shapes')
def shex_shapes():
    shapes_path = os.path.join(os.curdir, 'validation', 'shex', 'full.shexj')
    return send_file(shapes_path)


@app.route('/shacl/shapes')
def shacl_shapes_full():
    shacl_path = os.path.join(os.curdir, 'validation', 'shacl', 'full.shacl')
    return send_file(shacl_path)


@app.route('/shacl/subclasses')
def shacl_subclasses():
    subclasses_path = os.path.join(os.curdir, 'validation', 'shacl', 'subclasses.ttl')
    return send_file(subclasses_path)


@app.route('/page', methods=['POST'])
def get_page():
    ip = request.headers.get('X-Forwarded-For')
    browser.header_overrides = {
        'X-Forwarded-For': ip
    }
    browser.get(request.form['url'])
    return browser.page_source


if __name__ == '__main__':
    app.run()
