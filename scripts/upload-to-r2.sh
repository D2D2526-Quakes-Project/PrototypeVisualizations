rclone copy "/Users/aidan/Documents/School/CalTech/Quakes/Visiuals/data/binary" r2:quakes-binaries/ \
    --progress \
    --transfers 1 \
    --checkers 2 \
    --s3-chunk-size 100M \
    --s3-upload-concurrency 1 \
    --stats 10s \
    --log-file rclone-upload.log \
    --log-level INFO