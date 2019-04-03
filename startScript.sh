./fabricSetUp/stopFabric.sh
./fabricSetUp/teardownFabric.sh

docker kill $(docker ps -q)
docker rm $(docker ps -aq)
docker rmi $(docker images dev-* -q) 

composer card delete --card admin@fmcg

sudo rm admin@fmcg.card
sudo rm dist/fmcg.bna

./fabricSetUp/startFabric.sh
./fabricSetUp/createPeerAdminCard.sh

sudo rm -rf node_modules
npm install

composer network install --archiveFile dist/fmcg.bna --card PeerAdmin@hlfv1

composer network start --networkName fmcg --networkVersion 0.0.1 --card PeerAdmin@hlfv1 --networkAdmin admin --networkAdminEnrollSecret adminpw

composer card import --file admin@fmcg.card
composer network ping --card admin@fmcg

composer-rest-server -c admin@fmcg -n never -w true