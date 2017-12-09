FROM node:8

# create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle the app source
COPY . /usr/src/app
RUN npm install

# Set the prefs file in the expected location
USER node
RUN mkdir /home/node/.stackoff
COPY ./prefs.json /home/node/.stackoff/prefs.json

EXPOSE 8080

# ensure the runtime of the container is in production mode
ENV NODE_ENV production

ENTRYPOINT ["npm", "run", "server"]
