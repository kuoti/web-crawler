#!/bin/sh
#Simple script for running a mongo docker image
SERVICE="crawler"
ROOT_USER="root"
ROOT_PASSWD="secret"


docker rm -fv "mongo_$SERVICE"
docker volume create "mongo_${SERVICE}_data"

echo $1
if [ $1 -eq "wipe" ]; then
    echo "Wipping data"
    docker volume rm "mongo_${SERVICE}_data"
fi


echo "========================================="
echo .
echo "Connection URL: mongodb://${ROOT_USER}:${ROOT_PASSWD}@127.0.0.1:27017/${SERVICE}?authSource=admin"
echo .
echo "========================================="


docker run -i --rm \
--name "mongo_$SERVICE" \
-v mongo_data:/data/db \
-p 27017:27017 \
-e MONGO_INITDB_DATABASE=$SERVICE \
-e MONGO_INITDB_ROOT_USERNAME=root \
-e MONGO_INITDB_ROOT_PASSWORD=secret \
mongo

docker rm -fv $SERVICE
