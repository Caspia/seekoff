# Seekoff - Offline search and display of Stack Exchange questions and answers.

The purpose of Seekoff is to provide access to search and display capabilities in an environment
with no internet access. Currently that is limited to access to Stack Exchange questions
and answers, but may be expanded in the future to include other resources.

The primary targeted use case for Seekoff is for computer students in a prison environment,
where not only is internet access unavailable, but certain topics that might be available
on the public internet should not be made accessible, particularly information on how to
exploit computer security holes. So there are features that reject certain topics from
being added to the offline resources that are of primary value in that use case. But the application
may be of use in other environments as well.

## Overview

Seekoff is used in two distinct phases. One phase is indexing, where raw information is processed
and added to an Elasticsearch database. For Stack Exchange, the raw information consists of
xml files that are obtained from <a href="https://archive.org/details/stackexchange">Stack Exchange data dumps.</a> The first phase may be accessed from either a provided Electron app, or from a command line script.

The second phase uses the database from the first phase to provide search and display of the indexed resources. This phase consists of a Node.js server that provides a web interface. This server, along with a matching Elasticsearch service, is packaged as two Docker components.

## Dev

### Prerequisites

#### Elasticsearch

Typically in development environment you would first install a locally available Elasticsearch server that would be available to you in your environment. <a href="https://www.elastic.co/downloads/elasticsearch">Download</a> the freely available community version, and install it either on your local system or in a network location. If installing in a network, be aware that this version has no security by default, so anyone with access to the network location will have full control and access to the Elasticsearch database.

#### Node.js

<a href="https://nodejs.org/en/download/">Download</a> and install node.js on your local system. Node 8 or higher is required.

During development, it is assumed that mocha and electron have been installed globally:
```
npm install -g electron
npm install -f mocha
```

#### git

<a href="https://git-scm.com/downloads">Download</a> and install git.

### Installation

Clone a copy of the git repository for Seekoff from the github site:
```
git clone https://github.com/Caspia/seekoff.git
```

Populate the dependencies:
```
$ npm install
```

### Running in development

#### Indexing

Prior to indexing, you need to make a set of Stack Exchange .xml files available to the Docker containers. The required files are Posts.xml, Users.xml, Votes.xml, and PostLinks.json. These can be obtained from the <a href="https://archive.org/details/stackexchange">Stack Exchange offline dumps.</a>

By far the most popular Stack Exchange site is <a href="https://stackoverflow.com">stackoverflow</a> and indeed indexing of stackoverflow is the primary target of Seekoff. But the stackoverflow files are huge, and an indexing run typically takes hours or days. For development and testing purposes, it is highly recommended that you work with a smaller dataset. <a href="https://archive.org/download/stackexchange/networkengineering.stackexchange.com.7z">Network Engineering</a> would be a good choice for testing.

Start the included Electron app for a graphical interface to indexing:
```
npm start
```
#### Search server

This will start a local web server accessible on http://localhost:8080

```
npm run server
```

#### Testing
```
mocha
```

#### Documentation
Documentation of the code can be created in the docs subdirectory. This is mainly run to make sure
that consistent internal code documentation exists, but you can create and use the jsdoc html files if you want:
```
npm run docs
``` 

#### Build

The electron bootstrap repo used for Seekoff includes a packaging step that you can try, but this has not been tested since typically the Electron app is only used in development.
```
$ npm run build
```

Builds the app for macOS, Linux, and Windows, using [electron-packager](https://github.com/electron-userland/electron-packager).

## Running in production
Seekoff is designed to be deployed as two Docker containers, one containing the Elasticsearch database
server, and the other a Node.js webapp. Using a Windows-based Docker should be possible in principle, but has not been fully tested, so it is recommended that you run Seekoff from a Linux-based Docker install. Further instructions will assume that you have a Linux server that is can run Docker.

Typically you will have two separate deployments. One is the indexing server, used primarily to index data from the .xml files. The second is the offline server, used to take a set of Elasticsearch indices created on the indexing serer, and make them available offline in a webapp.

You could in principle use the development Electron server to create the indices, but because stackoverflow index runs typically take hours or days, it is recommended that you instead use the command line interface on a separate Linux deployment of an indexing server.

The setup of an online Linux server for indexing is identical to the setup of the offline server for the search webapp, as follows.

### Configuration for the Linux servers (online indexing and offline webapp)

#### Linux prerequisites.

Your Linux server needs at least git, docker, and docker-compose installed. How to do this varies depending on the Linux distribution, so I will not include instructions here. I've used a Debian 9-based system successfully.

#### Linux system configuration

<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/vm-max-map-count.html">Elasticsearch requires a tweak</a> to the standard Linux system control parameters to work. Add these lines to the bottom of /etc/sysctl.conf and restart the Linux system:
```
# needed for elasticsearch
vm.max_map_count=262144
```

#### Users

The Docker containers typically use user 1000 as the running user. Any volumes that must be accessed by the Docker containers (that is, the .xml files on the indexing server, and the Elasticsearch data files on both servers) should be accessible to user 1000 on the base Linux install where the volumes will be created. If you created a single non-admin user on the Linux docker server, that user probably has user id 1000. But when creating volumes, make sure that the volumes are owned by user 1000 specified by number. Instructions for that will also be given in the deployment instructions.

Since stackoff by default uses subdirectories under /srv for Docker volumes best practice is to create two subdirectories there, and make them owned by user 1000. Run as root:
```
cd /srv
mkdir elasticsearch
mkdir sedata
chown 1000:1000 elasticsearch
chown 1000:1000 sedata
```
Further operations on these directories should be done using user 1000, which is typically the first created user.

### Deploying an Elasticsearch index to an offline server
Typically in using seekoff, a set of Elasticsearch indexes is created on an online system with access to the Stack Exchange .xml files, and that index file is moved to an offline deployment of the Seekoff webapp with associated Elasticsearch database. To do this, you should stop the Elasticsearch server, then copy its datafiles to an archive.

By default, the Elasticsearch files in Stackoff are kept at /srv/elasticsearch. Go to that location, and create a copy of the ./data directory located there. Logged in as user 1000:
```
cd /srv/elasticsearch
rm -rf data
tar -cvzf data.tar.gz data
```
Prior to doing this, you might make sure that there are only four elasticsearch indices in the database, as Seekoff only requires four indices. Check directory /srv/elasticsearch/data/nodes/0/indices and make sure there are 4 subdirectories. (If not, then you have created multiple elasticsearch datasets, and you'll either need to delete them all and reindex, or figure out which ones are real and delete the others, or somehow only copy the 4 that you need).

The file data.tar.gz should now be copied to the offline deployment server to the directory /srv/elasticsearch. Stop the elasticsearch server, delete the existing ./data subdirectory, then extract the new one:
```
tar -xvzf data.tar.gz
```

Restart the Seekoff servers, and the new data should be available.

## Configuration
TODO

## TODO
We are still missing a lot of details.

## License

MIT © [R. Kent James](mailto:rkent@caspia.com)
