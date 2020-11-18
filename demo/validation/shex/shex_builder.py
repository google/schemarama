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

BASE = 'http://schema.org/validation#'


def merge_shapes(dir, shapes):
    for shape_file in os.listdir(dir):
        if os.path.isdir(os.path.join(dir, shape_file)):
            merge_shapes(os.path.join(dir, shape_file), shapes)
        else:
            name = shape_file.replace('.shexj', '')
            shapes[BASE + name] = json.loads(open(os.path.join(dir, shape_file)).read())


if __name__ == '__main__':
    raw = json.loads(open('raw.shexj').read())
    shapes = {}
    for shape in raw['shapes']:
        shapes[shape['id']] = shape
    merge_shapes('shapes', shapes)
    merge_shapes('specific', shapes)
    raw['shapes'] = list(shapes.values())
    open('full.shexj', 'w').write(json.dumps(raw))
