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


def find_files(directory, stop_elements, extension='.shacl'):
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
    shacls = [open('base.shacl').read()]
    shacls += find_files('shapes', [])
    shacls += find_files('raw_shapes', os.listdir('shapes'))
    shacls += find_files('specific', [])
    full = fill_temp_holes('\n\n\n'.join(shacls))
    open('full.shacl', 'w').write(full)




def find_unknown():
    defined_shapes = set([shex_file[:-6] for shex_file in os.listdir('shapes')])
    unknown = set()
    for shacl_file in os.listdir('shapes'):
        shape = open(f'shapes/{shacl_file}').read()
        links = set(re.findall("sh:node :ValidSchema(.*?)[ \]][;\n]", shape))

        unknown = unknown.union(links.difference(defined_shapes))
    return sorted(list(unknown))


def fill_temp_holes(shacl):
    holes = find_unknown()
    for hole in holes:
        shacl = shacl.replace(f'sh:node :{hole}', f'sh:class schema:{hole}')
    return shacl


if __name__ == '__main__':
    pack()
