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

import os
import re
import json

import sys
from typing import List

import dirlistproc
from jsonasobj import as_json
from pyshex.shex_evaluator import ShExEvaluator
from rdflib import Namespace


def find_files(directory, stop_elements, extension='.shex'):
    files = []
    for element in os.listdir(directory):
        _, ext = os.path.splitext(element)
        if stop_elements and element in stop_elements:
            continue
        path = os.path.join(directory, element)
        if os.path.isfile(path) and (extension == None or extension == ext):
            files.append(open(path).read())
        else:
            files += find_files(path, stop_elements, extension)
    return files


def pack():
    base = open('base.shex').read()
    shapes = [base]
    shapes += find_files('shapes', [])
    shapes += find_files('raw_shapes', os.listdir('shapes'))
    shapes += find_files('specific', [])
    full = fill_temp_holes(('\n' * 3).join(shapes))
    open('full.shex', 'w').write(full)


def to_shexj(input_fn, output_fn):
    evaluator: ShExEvaluator = ShExEvaluator(schema=input_fn)
    with open(output_fn, 'w') as f:
        f.write(as_json(evaluator._schema))
    return True


def find_unknown():
    defined_shapes = set([shex_file[:-5] for shex_file in os.listdir('shapes') + os.listdir('raw_shapes')])
    unknown = set()
    for shex_file in os.listdir('shapes'):
        shape = open(f'shapes/{shex_file}').read()
        links = set(re.findall("<#ValidSchema(.*?)>", shape))
        unknown = unknown.union(links.difference(defined_shapes))
    return sorted(list(unknown))


def fill_temp_holes(shex):
    holes = find_unknown()
    for hole in holes:
        shex = shex.replace(f'@<#Valid{hole}>', f'{{ a [schema:{hole}] }}')
    return shex


if __name__ == '__main__':
    pack()
    #to_shexj('full.shex', 'full.shexj')
