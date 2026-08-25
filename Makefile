.PHONY: idl web-build build run dev web-dev test

idl:
	hz update -idl ./idl/bill_book.thrift

web-build:
	cd web && npm install && npm run build

build: web-build
	go build -o output/bill-book .

run:
	go run .

dev:
	MODE_ENV=dev go run .

web-dev:
	cd web && npm install && npm run dev

test:
	go test ./...
