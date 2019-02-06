#!/bin/bash

# usage: ./replace-version.sh 0.4.2

set -eu

sed -i'' -e "s/^\(\s\+\"version\"\):.*$/\1: \"$1\",/" package.json
sed -i'' -e "s|^\(// version\):.*$|\1: $1|" src/sparql-support.js
sed -i'' -e "s/^\(\s\+version\):.*$/\1: \"$1\",/" src/sparql-support.js
