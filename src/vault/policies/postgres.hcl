# This section allows postgres to read its credenials
path "secret/data/postgres" {
	capabilities = ["read"]
}