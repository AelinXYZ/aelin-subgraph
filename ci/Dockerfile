# Builder
FROM node:16-alpine as builder

# Deps
RUN apk update && apk add git bash python3 g++ make

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install npm deps
COPY ./package.json .
RUN npm i
COPY . .

# Prepare subgraph 
# RUN npm run prepare:goerli-ci

# # no need to keep this
# RUN rm -rf ./node_modules

# # Deployer 
# FROM node:14-alpine as deployer

# # Install deps
# RUN apk update && apk add git

# RUN mkdir -p /usr/src/app
# WORKDIR /usr/src/app

# # Copy all files
# COPY --from=builder /usr/src/app/ ./
# COPY ./package.ci.json ./package.json

# RUN npm i
RUN chmod +x ./ci/generate-data.sh

ENTRYPOINT ["/bin/bash", "-c"]