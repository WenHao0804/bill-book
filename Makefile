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

# ------------------------------
# common begin
# ------------------------------
zip:
	rm -rf output && \
	mkdir output && \
	GOOS=linux GOARCH=amd64 go build -o output/main $(MAIN_PATH) && \
	cp -r conf output && \
	(cd output && zip -r ../$(ZIP_NAME) .) && \
	rm -rf output
# ------------------------------
# common end
# ------------------------------

# ------------------------------
# aws begin
# ------------------------------
AWS_SERVER_EXEC_ZIP = aws_server_exec.zip
aws_server_exec: build
	$(MAKE) zip ZIP_NAME=$(AWS_SERVER_EXEC_ZIP) MAIN_PATH=.
# ------------------------------
# aws end
# ------------------------------
