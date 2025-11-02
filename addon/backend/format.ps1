
echo "Running static analysis and formatting..."
staticcheck ./...

echo "Formatting Go code"
gofmt -s -l -w .
