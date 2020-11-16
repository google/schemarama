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

if __name__ == '__main__':
    data = open('raw.shacl').read()
    for shape_file in os.listdir('shapes'):
        shape_name = shape_file.replace('.shacl', '')
        shape = open(os.path.join('shapes', shape_file)).read()
        re.sub(rf':{shape_name}\s+a\s+sh:NodeShape\s+;[\S\s]*?\.\r?\n', shape, data)
    open('full.shacl', 'w').write(data)
