#!/bin/sh
#Simple script for running a mongo docker image
SERVICE="crawler"
EXTERNAL_PORT=27017
ROOT_USER="root"
ROOT_PASSWD="secret"
CONTAINER_NAME="mongo_$SERVICE"
VOLUME_NAME="mongo_${SERVICE}_data"

docker rm -fv $CONTAINER_NAME

arg="${1}x"
if [ $arg == "wipex" ]; then
    echo "Wipping data"
    docker volume rm $VOLUME_NAME
fi

docker volume create $VOLUME_NAME


echo "========================================="
echo .
echo "Connection URL: mongodb://${ROOT_USER}:${ROOT_PASSWD}@127.0.0.1:27017/${SERVICE}?authSource=admin"
echo .
echo "========================================="


docker run -i --rm \
--name $CONTAINER_NAME \
-v $VOLUME_NAME:/data/db \
-p $EXTERNAL_PORT:27017 \
-e MONGO_INITDB_DATABASE=$SERVICE \
-e MONGO_INITDB_ROOT_USERNAME=$ROOT_USER \
-e MONGO_INITDB_ROOT_PASSWORD=$ROOT_PASSWD \
mongo

docker rm -fv $SERVICE
