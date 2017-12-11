FROM node:8

USER node
# create app directory
RUN mkdir -p /home/node/app
WORKDIR /home/node/app

# Bundle the app source
COPY . /home/node/app
RUN npm install

# Set the prefs file in the expected location
RUN mkdir /home/node/.stackoff
COPY ./prefs.json /home/node/.stackoff/prefs.json

EXPOSE 8080

# ensure the runtime of the container is in production mode
ENV NODE_ENV production

ENTRYPOINT ["npm", "run", "server"]
