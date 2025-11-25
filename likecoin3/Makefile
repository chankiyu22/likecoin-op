.PHONY: setup
setup:
	npm install

.PHONY: build
build:
	npm run build

.PHONY: test
test:
	npm run test

.PHONY: ci
ci:
	npm run check-format
	npm run lint
	npm run test

.PHONY: deploy-local
deploy-local: export DOTENV_CONFIG_PATH=.env
deploy-local: export HARDHAT_IGNITION_CONFIRM_RESET=false
deploy-local: export HARDHAT_IGNITION_CONFIRM_DEPLOYMENT=false
deploy-local:
	npm run deploy:all-in-one:local -- --network localhost --reset

.PHONY: mint-local
mint-local:
	npx hardhat mint --network localhost --amount $(AMOUNT) --to $(TO)
