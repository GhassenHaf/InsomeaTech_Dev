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
            cp /home/ghass/InsomeaTech_Dev/InsomeaTech_Dev_Backend/.env ./InsomeaTech_Dev_Backend/.env

            docker compose down -v --remove-orphans
            docker compose up -d --remove-orphans
        '''
    }
}
    }
}
