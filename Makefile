.PHONY: decrypt-everything
decrypt-everything:
	blackbox_postdeploy

.PHONY: operator-key-link
operator-key-link:
	ln -s ../deploy/env.operator likenft/.env

.PHONY: remove-operator-key-link
remove-operator-key-link:
	rm -f likenft/.env

.PHONY: local-contracts
local-contracts:
	$(MAKE) -C operation init-local-state
	$(MAKE) -C likecoin3 deploy-local
	# Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
	$(MAKE) -C likecoin3 mint-local AMOUNT=10000 TO=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

.PHONY: abigen
abigen:
	make -C likecoin3 build
	mkdir -p abi
	cp likecoin3/artifacts/contracts/LikeProtocol.sol/LikeProtocol.json abi/
	jq '.abi' likecoin3/artifacts/contracts/LikeProtocol.sol/LikeProtocol.json > abi/LikeProtocol.abi.json
	cp likecoin3/artifacts/contracts/BookNFT.sol/BookNFT.json abi/
	jq '.abi' likecoin3/artifacts/contracts/BookNFT.sol/BookNFT.json > abi/BookNFT.abi.json
	cp likecoin3/artifacts/contracts/Likecoin.sol/Likecoin.json abi/
	jq '.abi' likecoin3/artifacts/contracts/Likecoin.sol/Likecoin.json > abi/Likecoin.abi.json
	cp likecoin3/artifacts/contracts/LikeCollective.sol/LikeCollective.json abi/
	jq '.abi' likecoin3/artifacts/contracts/LikeCollective.sol/LikeCollective.json > abi/LikeCollective.abi.json
	cp likecoin3/artifacts/contracts/LikeStakePosition.sol/LikeStakePosition.json abi/
	jq '.abi' likecoin3/artifacts/contracts/LikeStakePosition.sol/LikeStakePosition.json > abi/LikeStakePosition.abi.json
	jq '.abi' likecoin3/artifacts/contracts/veLike.sol/veLike.json > abi/veLike.abi.json
	make -C likenft-indexer abigen
	make -C migration-backend abigen
	make -C likecollective-indexer abigen

.PHONY: setup
setup:
	make -C signer-backend secret
	make -C migration-backend secret
	make -C likenft-indexer secret

.PHONY: start
start:
	docker compose up -d --wait
	$(MAKE) run-migrations
	$(MAKE) local-contracts
	$(MAKE) follow-logs

.PHONE: follow-logs
follow-logs:
	docker compose logs -f

.PHONY: stop
stop:
	docker compose stop
	docker compose rm -f
	$(MAKE) clean-transaction-volumes

.PHONY: clean-transaction-volumes
clean-transaction-volumes:
	docker volume ls | grep 'likecoin-30_db_data_migration_backend' | awk '{ print $$2 }' | xargs docker volume rm
	docker volume ls | grep 'likecoin-30_db_data_signer_backend' | awk '{ print $$2 }' | xargs docker volume rm

.PHONY: clean-docker-volumes
clean-docker-volumes:
	docker compose down
	docker compose rm -f
	docker volume ls | grep 'likecoin-30' | awk '{ print $$2 }' | xargs docker volume rm

.PHONY: run-migrations
run-migrations:
	docker compose run --rm migration-backend make run-migration
	docker compose run --rm signer-backend make run-migration

.PHONY: docker-images
docker-images:
	DOCKER_BUILD_ARGS=--push make -C migration-backend docker-image
	DOCKER_BUILD_ARGS=--push make -C signer-backend docker-image
	DOCKER_BUILD_ARGS=--push make -C likenft-indexer docker-image
	DOCKER_BUILD_ARGS=--push make -C likecollective-indexer docker-image
	DOCKER_BUILD_ARGS=--push make -C likenft-migration docker-image
	DOCKER_BUILD_ARGS=--push make -C likecoin-migration docker-image
	DOCKER_BUILD_ARGS=--push make -C migration-admin docker-image
	DOCKER_BUILD_ARGS=--push make -C likecollective-staking-position-image docker-image

.PHONY: deploy
deploy: decrypt-everything
	make -C deploy deploy
