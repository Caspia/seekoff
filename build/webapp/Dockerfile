FROM node:8

USER node
# create app directory
RUN mkdir -p /home/node/app
WORKDIR /home/node/app

# Bundle the app source
ENV NODE_ENV production
COPY . /home/node/app
RUN npm install

# Set the prefs file in the expected location
RUN mkdir /home/node/.stackoff
COPY ./prefs.json /home/node/.stackoff/prefs.json

EXPOSE 8080

ENTRYPOINT ["npm", "run", "server"]
