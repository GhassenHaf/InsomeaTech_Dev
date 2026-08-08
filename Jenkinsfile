pipeline {
    agent any

    stages {
        stage('1. Build Images') {
            steps {
                echo 'Building Angular & Express Docker images...'
		git clean -ffdx
                sh 'docker compose build'
            }
        }
        stage('2. Launch Containers') {
    steps {
        echo 'Starting full-stack application stack...'
        sh '''
	    rm -rf InsomeaTech_Dev_Backend/init-db/01-schema.sql
            cat << 'EOF' > InsomeaTech_Dev_Backend/.env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=insomea_db
DB_USER=dev_user
DB_PASSWORD=my_secure_password
DB_SCHEMA=insomea_tech
# Azure AD placeholders so Passport doesn't crash on startup
AZURE_CLIENT_ID=e75c2cda-f403-4df1-8b0a-eaaac0bf91de
AZURE_CLIENT_SECRET=WpU8Q~z7pzq3KPEiQMoMCNTuaHnkcbbU9AMetaNG
AZURE_TENANT_ID=b5ddb5f6-c713-48e9-a93d-d9fa7d6d6ae8
AZURE_CALLBACK_URL=http://localhost:3000/api/auth/callback
EOF
	    cp .env InsomeaTech_Dev_Backend/.env

            docker compose down -v --remove-orphans
            docker compose up -d --remove-orphans
        '''
    }
}
    }
}
