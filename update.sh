#!/bin/bash

while [[ $# -gt 1 ]]
do
key="$1"

case $key in
    -f|--full)
    BUILD_FULL="--full"
    shift # past argument
    ;;
    -i|--init)
    BUILD_INIT="--init"
    shift # past argument
    ;;
    *)
            # unknown option
    ;;
esac
shift # past argument or value
done

BASE_DIR=$(dirname $0)

pushd ${BASE_DIR}

git pull
# paver risks_static
./manage.sh riskstatic ${BUILD_FULL} ${BUILD_INIT}
./manage.sh collectstatic --noinput
./manage.sh migrate

