/*  
	Describes what Vault sends (a JSON) after authentification with
	role-id and secret-id, searches for auth.client_token
*/
export interface VaultApproleResponse {
	auth: {
		client_token: string;
	};
}

/* 
	Describes the credentials that Vault sends after successfull
	authentification
*/
export interface VaultSecretResponse {
	data: {
		data: {
			postgres_user: string;
			postgres_password: string;
			postgres_db: string;
			jwt_secret: string;
			redis_password: string; 
		};
	};
}

/*
	Wrapper with fetched credentials
*/
export interface BackendSecrets {
	postgresUser: string;
	postgresPassword: string;
	postgresDb: string;
	jwtSecret: string;
	redisPassword: string;
}