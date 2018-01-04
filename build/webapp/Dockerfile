FROM node:8

# utilities helpful in development
RUN apt-get update && apt-get install -y nano && apt-get install -y curl 
# create app directory
RUN mkdir -p /home/node/app
WORKDIR /home/node/app

# Bundle the app source
ENV NODE_ENV production
COPY . /home/node/app
RUN chmod 755 bin/*
RUN chown node:node -R .
USER node
RUN npm install

# Set the prefs file in the expected location
RUN mkdir /home/node/.seekoff
COPY ./prefs.json /home/node/.seekoff/prefs.json

EXPOSE 8080

ENTRYPOINT ["npm", "run", "server"]
