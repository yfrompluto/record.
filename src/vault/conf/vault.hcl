/*
	[🦎] INFO DEV
	ui; enable the Vault web interface dashboard
	api_addr; external address that clients will use to comunicate with the Vault node
	cluster_addr; internal address used by Vault nodes to cumminicate with each other\
	-
	disable_mlock; skipos locking memory (suitable for Docker)
	disable_cache; minimises secret leakage in memory (impacts performances, makes it slow..)
	-
	log_level; gloabl leve of logging				→ will be changed to info during prod
	log_requests_level; logs from completed http requests → will be changed to 'warn/off' during prod
	-
	storage "raft"; Raft as the backend storage for vault
	node_id; the unique identifier for each node
	-
	listener "tcp"; tells Vault to listen on all interfaces and requires TLS certs for communuication
*/

ui = true
api_addr = "https://vault:8200"
cluster_addr = "https://vault:8201"

disable_mlock = true
disable_cache = true

log_level = "debug"
log_requests_level = "off"

storage "raft" {
	path = "/vault/data"
	node_id = "transcendence_vault_node"
}

listener "tcp" {
	address = "0.0.0.0:8200" 
	tls_disable = false
	tls_cert_file = "/vault/tls/vault.crt"
	tls_key_file  = "/vault/tls/vault.key"
}