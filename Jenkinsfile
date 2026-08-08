pipeline {
    agent any

    stages {
	stage('Tear Down Existing Containers') {
            steps {
                // The -v flag destroys the stale, empty Docker volume
                sh 'docker-compose down -v'
            }
        }

        stage('1. Build Images') {
            steps {
                echo 'Building Angular & Express Docker images...'
		sh 'git clean -ffdx'
                sh 'docker compose build' 
            }
        }
        stage('2. Launch Containers') {
    steps {
        echo 'Starting full-stack application stack...'
        sh '''
	    rm -rf InsomeaTech_Dev_Backend/init-db/01-schema.sql
	    echo "DB_HOST=postgres" >> InsomeaTech_Dev_Backend/.env
	    echo "DB_PORT=5432" >> InsomeaTech_Dev_Backend/.env
	    echo "DB_NAME=insomea_db" >> InsomeaTech_Dev_Backend/.env
	    echo "DB_USER=dev_user" >> InsomeaTech_Dev_Backend/.env
	    echo "DB_PASSWORD=my_secure_password" >> InsomeaTech_Dev_Backend/.env
	    echo "DB_SCHEMA=insomea_tech" >> InsomeaTech_Dev_Backend/.env
	    # Azure AD placeholders so Passport doesn't crash on startup
	    echo "AZURE_CLIENT_ID=e75c2cda-f403-4df1-8b0a-eaaac0bf91de" >> InsomeaTech_Dev_Backend/.env
	    echo "AZURE_CLIENT_SECRET=WpU8Q~z7pzq3KPEiQMoMCNTuaHnkcbbU9AMetaNG" >> InsomeaTech_Dev_Backend/.env
	    echo "AZURE_TENANT_ID=b5ddb5f6-c713-48e9-a93d-d9fa7d6d6ae8" >> InsomeaTech_Dev_Backend/.env
	    echo "AZURE_CALLBACK_URL=https://localhost:3000/api/auth/callback" >> InsomeaTech_Dev_Backend/.env


            docker compose down -v --remove-orphans
            docker compose up -d --remove-orphans
        '''
    }
}
    }
}
