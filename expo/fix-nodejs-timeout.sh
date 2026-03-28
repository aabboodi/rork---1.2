#!/bin/bash

# Fix all NodeJS.Timeout references in the services directory
find services -name "*.ts" -type f -exec sed -i 's/NodeJS\.Timeout/ReturnType<typeof setInterval>/g' {} \;

echo "Fixed all NodeJS.Timeout references"