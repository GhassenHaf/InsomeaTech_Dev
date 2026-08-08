pipeline {
    agent any

    stages {
        stage('1. Build Images') {
            steps {
                echo 'Building Angular & Express Docker images...'
                sh 'docker compose build'
            }
        }
        stage('2. Launch Containers') {
    steps {
        echo 'Starting full-stack application stack...'
        sh '''
            if [ ! -f InsomeaTech_Dev_Backend/.env ]; then
                echo "PORT=5000" > InsomeaTech_Dev_Backend/.env
                echo "POSTGRES_USER=postgres" >> InsomeaTech_Dev_Backend/.env
                echo "POSTGRES_PASSWORD=postgres" >> InsomeaTech_Dev_Backend/.env
                echo "POSTGRES_DB=insomea_db" >> InsomeaTech_Dev_Backend/.env
            fi

            docker compose down -v --remove-orphans
            docker compose up -d --remove-orphans
        '''
    }
}
    }
}
