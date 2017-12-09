FROM node:8

# create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle the app source
COPY . /usr/src/app

# ensure the runtime of the container is in production mode
ENV NODE_ENV production
