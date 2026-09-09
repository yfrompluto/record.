# This section allows nginx to issue certificates from the PKI engine
path "pki/issue/nginx" {
	capabilities = ["create", "update"]
}

# This section allows nginx to read the CA certificate
path "pki/ca" {
	capabilities = ["read"]
}